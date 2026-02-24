use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use std::collections::HashSet;


use swc_core::common::{sync::Lrc, SourceMap};
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax};

use swc_core::ecma::ast::{ExportAll, ImportDecl, NamedExport};
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

fn main() {
    let src_dir = "src";
    let dist_dir = "dist";
    let verbose = true;

    js_scan(src_dir, dist_dir, verbose);

    if verbose {
        println!("Compiling HTML files from '{}' to '{}'...", src_dir, dist_dir);
    }

    for entry in WalkDir::new(src_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "html") {
            process_html(path, src_dir, dist_dir, verbose);
        }
    }
    
    println!("Done!");
}

fn js_scan(src_dir: &str, dist_dir: &str, verbose: bool) {
    if verbose {
        println!("Scanning JS files in '{}' for HTML imports...", dist_dir);
    }

    let mut html_files_to_process: HashSet<(PathBuf, PathBuf)> = HashSet::new();

    for entry in WalkDir::new(dist_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "js") {
            println!("Found {:?}", path);
            process_js_file(path, src_dir, dist_dir, &mut html_files_to_process, verbose);
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

        for task in rewriter.discovered_html {
            html_files.insert(task);
        }
        println!("{:?}", html_files);
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

fn process_html(src_path: &Path, src_root: &str, dist_root: &str, verbose: bool) {
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

    let relative_path = src_path.strip_prefix(src_root).unwrap();
    let dest_path = Path::new(dist_root).join(relative_path).with_extension("html.js");

    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).unwrap();
    }

    fs::write(&dest_path, js_content).unwrap();
    
    if verbose {
        println!("HTML -> JS: {:?}", dest_path);
    }
}
