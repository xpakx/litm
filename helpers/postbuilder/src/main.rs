use std::fs;
use std::path::Path;
use walkdir::WalkDir;

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

    for entry in WalkDir::new(dist_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "js") {
            println!("Found {:?}", path)
        }
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
