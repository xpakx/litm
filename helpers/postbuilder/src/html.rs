use lol_html::{element, text, HtmlRewriter, Settings, EndTagHandler};
use regex::Regex;
use lazy_static::lazy_static;
use std::cell::RefCell;
use std::rc::Rc;


lazy_static! {
    static ref RE_ATTR_SQUARE: Regex = Regex::new(r"^\[(.+)\]$").unwrap();
    static ref RE_ATTR_PAREN: Regex = Regex::new(r"^\((.+)\)$").unwrap();
    static ref RE_TEXT_INTERPOLATION: Regex = Regex::new(r"\{\{(.+)\}\}").unwrap();
}

pub fn html_test() {
    let mut id_counter = 0;
    let input = r#"<div id="target" [attr]="val" (event)="run()">{{data}}</div><span>Simple text</span>"#;


    let id_stack: Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(Vec::new()));
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


                    let stack = id_stack.clone();
                    stack.borrow_mut().push(id.clone());


                    let stack_for_pop = stack.clone();
                    if let Some(handlers) = el.end_tag_handlers() {
                        let handler: EndTagHandler = Box::new(move |_| {
                            stack_for_pop.borrow_mut().pop();
                            Ok(())
                        });
                        handlers.push(handler);
                    } else {
                        stack_for_pop.borrow_mut().pop();
                    }


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
                text!("*", |text| {
                    if RE_TEXT_INTERPOLATION.is_match(text.as_str()) {

                        let stack = id_stack.clone();
                        let current_id = stack.borrow().last().cloned().unwrap_or_else(|| "root".to_string());
                        println!("Text '{}' is inside element with ID: {}", text.as_str(), current_id);
                        text.remove();

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

