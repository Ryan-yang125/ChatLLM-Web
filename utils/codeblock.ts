interface languageMap {
  [key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
  javascript: '.js',
  python: '.py',
  java: '.java',
  c: '.c',
  cpp: '.cpp',
  'c++': '.cpp',
  'c#': '.cs',
  ruby: '.rb',
  php: '.php',
  swift: '.swift',
  'objective-c': '.m',
  kotlin: '.kt',
  typescript: '.ts',
  go: '.go',
  perl: '.pl',
  rust: '.rs',
  scala: '.scala',
  haskell: '.hs',
  lua: '.lua',
  shell: '.sh',
  sql: '.sql',
  html: '.html',
  css: '.css',
};

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXY3456789'; // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return lowercase ? result.toLowerCase() : result;
};

export const testMdStr =
  "Within a code block, ampersands (`&`) and angle brackets (`<` and `>`)\n are automatically converted into HTML entities. This makes it very\n easy to include example HTML source code using Markdown -- just paste\n it and indent it, and Markdown will handle the hassle of encoding the\n ampersands and angle brackets. For example, this:\n ``` typescript\nexport const generateRandomString = (length: number, lowercase = false) => {\nconst chars = 'ABCDEFGHJKLMNPQRSTUVWXY3456789';\nlet result = '';\nfor (let i = 0; i < length; i++) {\nresult += chars.charAt(Math.floor(Math.random() * chars.length));\n}\return lowercase ? result.toLowerCase() : result;\n};";
