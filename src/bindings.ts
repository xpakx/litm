export type Binding = 
  | { kind: 'attribute', elem: string, attr: string, signal: string }
  | { kind: 'class', elem: string, signal: string }
  | { kind: 'content', elem: string, signal: string } 
  | { kind: 'action', elem: string, function: string, action: {action: "click"} | {action: string, trigger: string} };
