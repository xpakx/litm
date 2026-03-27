use lol_html::html_content::Attribute;
use lol_html::{element, text, HtmlRewriter, Settings, EndTagHandler};
use regex::Regex;
use lazy_static::lazy_static;
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
pub struct HtmlComponentData {
    pub html: String,
    pub bindings: Vec<Binding>
}


lazy_static! {
    static ref RE_ATTR_SQUARE: Regex = Regex::new(r"^\[(.+)\]$").unwrap();
    static ref RE_ATTR_PAREN: Regex = Regex::new(r"^\((.+)\)$").unwrap();
    static ref RE_TEXT_INTERPOLATION: Regex = Regex::new(r"\{\{(.+)\}\}").unwrap();
}

pub fn html_test() -> HtmlComponentData {
    let mut id_counter = 0;
    let input = r#"<div id="target" [attr]="val" (event)="run()">{{data}}</div><span>Simple text</span>"#;
    let bindings: Rc<RefCell<Vec<Binding>>> = Rc::new(RefCell::new(Vec::new()));


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


                    let bindings = bindings.clone();
                    for attr in el.attributes() {
                        if RE_ATTR_SQUARE.is_match(&attr.name()) {
                            attrs_to_remove.push(attr.name());
                            bindings.borrow_mut().push(
                                square_to_binding(&id, attr)
                            );
                        } else if RE_ATTR_PAREN.is_match(&attr.name()) {
                            attrs_to_remove.push(attr.name());
                            bindings.borrow_mut().push(
                                paren_to_binding(&id, attr)
                            );
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
                        let bindings = bindings.clone();
                        bindings.borrow_mut().push(
                            content_to_binding(&current_id, text.as_str())
                        );
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


    let bin_ref_cell = Rc::try_unwrap(bindings)
        .expect("Couldn't get bindings");
    let bindings = bin_ref_cell.into_inner(); 

    HtmlComponentData {
        bindings: bindings,
        html: final_html
    }
}

fn square_to_binding(id: &String, attr: &Attribute) -> Binding {
    let name = attr.name();
    let name = &name[1..name.len()-1];

    if name.contains('.') {
        let (prev, attr_name) = name.split_once('.').unwrap();
        match prev {
            "class" => return Binding::ClassSpecific {
                elem: id.clone(), 
                class_name: attr_name.to_string(), 
                signal: attr.value()
            },
            "style" => return Binding::Style {
            elem: id.clone(),
            attr: attr_name.to_string(),
            signal: attr.value()
            },
            _ => {}
        }
    }
    if name == "class" {
        return Binding::Class { 
            elem: id.clone(),
            signal: attr.value()
        }
    }
    Binding::Attribute { 
        elem: id.clone(),
        attr: name.to_string(),
        signal: attr.value()
    }
}

fn paren_to_binding(id: &String, attr: &Attribute) -> Binding {
    let name = attr.name();
    let name = &name[1..name.len()-1];

    Binding::Action {
        action: match name {
            "click" => ActionType::Click,
            _ => ActionType::Trigger {trigger: name.to_string()}
        },
        elem: id.clone(),
        function: attr.value()
    }
}


fn content_to_binding(id: &String, text: &str) -> Binding {
    let name = &text[2..text.len()-2];
    Binding::Content {
        elem: id.clone(),
        signal: name.to_string(),
    }
}


#[derive(Debug)]
pub enum ActionType {
    Click,
    Trigger { trigger: String },
}

#[derive(Debug)]
pub enum Binding {
    Attribute {
        elem: String,
        attr: String,
        signal: String,
    },
    Class {
        elem: String,
        signal: String,
    },
    ClassSpecific {
        elem: String,
        class_name: String,
        signal: String,
    },
    Style {
        elem: String,
        attr: String,
        signal: String,
    },
    Content {
        elem: String,
        signal: String,
    },
    Action {
        action: ActionType,
        elem: String,
        function: String,
    }
}
