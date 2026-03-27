use swc_core::{
    common::{DUMMY_SP, SyntaxContext},
    ecma::ast::*,

    common::{sync::Lrc, SourceMap},
    ecma::codegen::{text_writer::JsWriter, Emitter, Config},
};

pub fn generate_component_class(class_name: &str, html_content: &str) -> Stmt {
    let static_html_method = ClassMember::Method(ClassMethod {
        span: DUMMY_SP,
        key: PropName::Ident(IdentName::new("html".into(), DUMMY_SP)),
        function: Box::new(Function {
            params: vec![],
            decorators: vec![],
            span: DUMMY_SP,
            body: Some(BlockStmt {
                span: DUMMY_SP,
                stmts: vec![Stmt::Return(ReturnStmt {
                    span: DUMMY_SP,
                    arg: Some(Box::new(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: html_content.into(),
                        raw: None,
                    })))),
                })],
                ..Default::default()
            }),
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: None,
            ..Default::default()
        }),
        kind: MethodKind::Method,
        is_static: true,
        accessibility: None,
        is_abstract: false,
        is_optional: false,
        is_override: false,
    });

    Stmt::Decl(Decl::Class(ClassDecl {
        ident: Ident::new(
                   class_name.into(),
                   DUMMY_SP,
                   SyntaxContext::empty(),
               ),
               declare: false,
               class: Box::new(Class {
                   span: DUMMY_SP,
                   decorators: vec![],
                   body: vec![static_html_method],
                   super_class: Some(Box::new(Expr::Ident(Ident::new(
                                   "HTMLComponent".into(),
                                   DUMMY_SP,
                                   SyntaxContext::empty(),
                   )))),
                   is_abstract: false,
                   type_params: None,
                   super_type_params: None,
                   implements: vec![],
                   ..Default::default()
               }),
    }))
}

pub fn generate() {
    let ast_stmt = generate_component_class(
        "HelloComponent", 
        "<div>Hello world!</div>"
    );

    let script = Script {
        span: DUMMY_SP,
        body: vec![ast_stmt],
        shebang: None,
    };

    let cm: Lrc<SourceMap> = Default::default();
    let mut buf = vec![];

    {
        let mut emitter = Emitter {
            cfg: Config::default(),
            cm: cm.clone(),
            comments: None,
            wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
        };

        emitter.emit_script(&script).unwrap();
    }

    let js_output = String::from_utf8(buf).unwrap();
    println!("{}", js_output);
}
