export type Binding = 
  | { type: 'attribute', elem: string, attr: string, signal: string }
  | { type: 'class', elem: string, signal: string }
  | { type: 'content', elem: string, signal: string } 
  | { type: 'action', elem: string, function: string, action: {action: "click"} | {action: string, trigger: string} };
