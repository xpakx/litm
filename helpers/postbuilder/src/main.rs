use std::fs;
use std::path::{Path, PathBuf};
use std::io::{self};
use walkdir::WalkDir;
use std::collections::HashSet;


use swc_core::common::{sync::Lrc, SourceMap};
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax};

use swc_core::ecma::ast::{ExportAll, ImportDecl, NamedExport};
use swc_core::ecma::codegen::{text_writer::JsWriter, Emitter};
use swc_core::ecma::visit::{VisitMut, VisitMutWith};
use clap::{Parser as ClapParser, Subcommand, ValueEnum};

mod html;
mod generator;

fn main() {
  let cli = Cli::parse();

    match &cli.command {
        None => postbuild(),
        Some(Commands::Build) => postbuild(),
        Some(Commands::New { name }) => {
            println!("Creating project: {}", name);
            // TODO
        },
        Some(Commands::Generate { artifact_type, name, path }) => {
            match artifact_type {
                Artifact::Component => 
                    generate_component(&name, &path).unwrap(),
                Artifact::Service =>
                    generate_service(&name, &path).unwrap()
            }
            // TODO
        },

        Some(Commands::Html) => {
            let tst = html::html_test();
            let json_data = serde_json::to_string(&tst.bindings).unwrap();
            println!("{}", json_data);
            generator::generate(tst);
        },
    }
}


fn postbuild() {
    let src_dir = "src";
    let dist_dir = "dist";
    let verbose = true;

    let mut html_files_to_process: HashSet<(PathBuf, PathBuf)> = HashSet::new();
    js_scan(src_dir, dist_dir, verbose, &mut html_files_to_process);

    if verbose {
        println!("Compiling HTML files from '{}' to '{}'...", src_dir, dist_dir);
    }


    for (src_path, dest_path) in html_files_to_process {
        process_html(&src_path, &dest_path, verbose);
    }

    // TODO: current idea is to transform this to web component with event hooks
    // and easily updatable variables
    
    println!("Done!");
}

fn js_scan(
    src_dir: &str,
    dist_dir: &str,
    verbose: bool,
    html_files: &mut HashSet<(PathBuf, PathBuf)>,
    ) {
    if verbose {
        println!("Scanning JS files in '{}' for HTML imports...", dist_dir);
    }


    for entry in WalkDir::new(dist_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "js") {
            println!("Found {:?}", path);
            process_js_file(path, src_dir, dist_dir, html_files, verbose);
        }
    }

}

fn process_js_file(
    js_path: &Path,
    src_root: &str,
    dist_root: &str,
    html_files: &mut HashSet<(PathBuf, PathBuf)>,
    verbose: bool,
) {
    let cm: Lrc<SourceMap> = Default::default();

    let fm = match cm.load_file(js_path) {
        Ok(fm) => fm,
        Err(_) => return,
    };

    let lexer = Lexer::new(
        Syntax::Es(Default::default()),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );

    let mut parser = Parser::new_from(lexer);

    let mut module = match parser.parse_module() {
        Ok(module) => module,
        Err(_) => {
            eprintln!("Failed to parse JS file: {:?}", js_path);
            return;
        }
    };

    let js_dist_dir = js_path.parent().unwrap();
    let js_src_dir = Path::new(src_root).join(js_dist_dir.strip_prefix(dist_root).unwrap());
    if verbose {
        println!("   {:?} -> {:?}", js_dist_dir, js_src_dir);
    }
    
    let mut rewriter = HtmlImportRewriter {
        js_src_dir,
        js_dist_dir: js_dist_dir.to_path_buf(),
        discovered_html: Vec::new(),
        modified: false,
    };

    module.visit_mut_with(&mut rewriter);

    if rewriter.modified {
        let mut buf = vec![];
        {
            let mut emitter = Emitter {
                cfg: swc_core::ecma::codegen::Config::default(),
                cm: cm.clone(),
                comments: None,
                wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
            };
            if let Err(e) = emitter.emit_module(&module) {
                eprintln!("Failed to emit code for {:?}: {:?}", js_path, e);
                return;
            }
        }

        fs::write(js_path, String::from_utf8(buf).unwrap()).unwrap();
        
        if verbose {
            println!("Updated imports in: {:?}", js_path);
        }


        for task in rewriter.discovered_html {
            html_files.insert(task);
        }
    }

}


struct HtmlImportRewriter {
    js_src_dir: PathBuf,
    js_dist_dir: PathBuf,
    discovered_html: Vec<(PathBuf, PathBuf)>,
    modified: bool,
}

impl HtmlImportRewriter {
    fn process_path(&mut self, import_path: &mut swc_core::ecma::ast::Str) {
        let src_val = import_path.value.to_atom_lossy().to_string();
        
        if src_val.ends_with(".html") {
            self.modified = true;

            let src_html_path = self.js_src_dir.join(&src_val);
            let dist_js_path = self.js_dist_dir.join(format!("{}.js", src_val));

            self.discovered_html.push((src_html_path, dist_js_path));

            import_path.value = format!("{}.js", src_val).into();
            import_path.raw = None;
        }
    }
}

impl VisitMut for HtmlImportRewriter {
    fn visit_mut_import_decl(&mut self, node: &mut ImportDecl) {
        self.process_path(&mut node.src);
        node.visit_mut_children_with(self);
    }

    fn visit_mut_named_export(&mut self, node: &mut NamedExport) {
        if let Some(src) = &mut node.src {
            self.process_path(src);
        }
        node.visit_mut_children_with(self);
    }

    // ???? not sure about that
    fn visit_mut_export_all(&mut self, node: &mut ExportAll) {
        self.process_path(&mut node.src);
        node.visit_mut_children_with(self);
    }
}

fn process_html(src_path: &Path, dist_path: &Path, verbose: bool) {
    let html_content = match fs::read_to_string(src_path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Failed to read {:?}: {}", src_path, e);
            return;
        }
    };

    let escaped_html = html_content
        .replace('\\', "\\\\")
        .replace('`', "\\`")
        .replace('$', "\\$");

    let js_content = format!("export default `{}`;", escaped_html);

    if let Some(parent) = dist_path.parent() {
        fs::create_dir_all(parent).unwrap();
    }

    fs::write(&dist_path, js_content).unwrap();
    
    if verbose {
        println!("HTML -> JS: {:?}", dist_path);
    }
}


#[derive(ClapParser)]
#[command(name = "postbuilder")]
#[command(about = "A tool for building LitM app", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    New {
        name: String,
    },

    Build,

    #[command(alias = "g")]
    Generate {
        artifact_type: Artifact,
        name: String,
        #[arg(short, long, default_value = "./src")]
        path: String,
    },

    Html,
}

#[derive(ValueEnum, Clone, Debug)]
enum Artifact {
    #[value(alias = "c")]
    Component,
    
    #[value(alias = "s")]
    Service,
}


fn generate_component(name: &String, _path: &String)  -> io::Result<()> {
    println!("Generating component: {}", name);

    let dir_path = format!("src/{}", name);
    let path = Path::new(&dir_path);

    if path.exists() {
        return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("Directory {} already exists", dir_path),
        ));
    }

    fs::create_dir_all(path)?;

    fs::File::create(path.join(format!("{}.ts", name)))?;
    fs::File::create(path.join(format!("{}.html", name)))?;

    println!("Successfully generated component: {}", name);
    Ok(())
}

fn generate_service(name: &String, _path: &String)  -> io::Result<()> {
    println!("Generating service: {}", name);

    let dir_path = Path::new("src/");
    let path = dir_path .join(format!("{}.ts", name));

    if path.exists() {
        return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("File {}.ts already exists", name),
        ));
    }

    fs::File::create(path)?;

    println!("Successfully generated service: {}", name);
    Ok(())
}
