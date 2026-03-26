use lol_html::{element, HtmlRewriter, Settings};
use regex::Regex;
use lazy_static::lazy_static;


lazy_static! {
    static ref RE_ATTR_SQUARE: Regex = Regex::new(r"^\[(.+)\]$").unwrap();
    static ref RE_ATTR_PAREN: Regex = Regex::new(r"^\((.+)\)$").unwrap();
    static ref RE_TEXT_INTERPOLATION: Regex = Regex::new(r"\{\{(.+)\}\}").unwrap();
}

pub fn html_test() {
    let mut id_counter = 0;
    let input = r#"<div id="target" [attr]="val" (event)="run()">{{data}}</div><span>Simple text</span>"#;

    let mut output = vec![];
    let mut rewriter = HtmlRewriter::new(
        Settings {
            element_content_handlers: vec![
                element!("*", |el| {
                    let mut attrs_to_remove = Vec::new();
                    let id = el.get_attribute("id").unwrap_or_else(|| {
                        id_counter += 1;
                        let new_id = format!("gen-id-{}", id_counter);
                        el.set_attribute("id", &new_id).unwrap();
                        new_id
                    });


                    for attr in el.attributes() {
                        if RE_ATTR_SQUARE.is_match(&attr.name()) {
                            println!("Found Square Attribute on {}: {} = {}", id, attr.name(), attr.value());
                            attrs_to_remove.push(attr.name());
                        } else if RE_ATTR_PAREN.is_match(&attr.name()) {
                            println!("Found Paren Attribute on {}: {} = {}", id, attr.name(), attr.value());
                            attrs_to_remove.push(attr.name());
                        }
                    }

                    for name in attrs_to_remove {
                        el.remove_attribute(&name);
                    }
                    Ok(())
                }),
            ],
            ..Settings::default()
        },
        |c: &[u8]| output.extend_from_slice(c),
    );

    rewriter.write(input.as_bytes()).unwrap();
    rewriter.end().unwrap();

    let final_html = String::from_utf8(output).expect("Invalid UTF-8");

    println!("--- Final HTML ---");
    println!("{}", final_html);
}

