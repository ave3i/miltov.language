// parser.js

function parseMiltov(source) {
  const tokens = tokenize(source);
  let current = 0;

  function tokenize(input) {
    const tokenSpecs = [
      [/^\s+/, null],
      [/^milt\b/, 'MILTVAR'],
      [/^func\b/, 'FUNC'],
      [/^return\b/, 'RETURN'],
      [/^if\b/, 'IF'],
      [/^else\b/, 'ELSE'],
      [/^while\b/, 'WHILE'],
      [/^message\b/, 'MESSAGE'],
      [/^shout\b/, 'SHOUT'],
      [/^\{/, 'LBRACE'],
      [/^\}/, 'RBRACE'],
      [/^\(/, 'LPAREN'],
      [/^\)/, 'RPAREN'],
      [/^\,/, 'COMMA'],
      [/^\=/, 'EQUAL'],
      [/^\+/, 'PLUS'],
      [/^\-/, 'MINUS'],
      [/^\*/, 'MULTIPLY'],
      [/^\//, 'DIVIDE'],
      [/^\>/, 'GREATER'],
      [/^\</, 'LESS'],
      [/^\>=/, 'GTE'],
      [/^\<=/, 'LTE'],
      [/^\==/, 'EQUAL_EQUAL'],
      [/^\!/, 'NOT'],
      [/^\!=/, 'NOT_EQUAL'],
      [/^\".*?\"/, 'STRING'],
      [/^\d+/, 'NUMBER'],
      [/^[a-zA-Z_][a-zA-Z0-9_]*/, 'IDENTIFIER'],
      [/^./, 'UNKNOWN'],
    ];

    const tokens = [];
    let str = input;

    while (str.length > 0) {
      let matched = false;
      for (let [regex, type] of tokenSpecs) {
        const match = str.match(regex);
        if (match) {
          matched = true;
          if (type) {
            tokens.push({ type, value: match[0] });
          }
          str = str.slice(match[0].length);
          break;
        }
      }
      if (!matched) throw new Error("Unexpected token: " + str[0]);
    }
    return tokens;
  }

  function peek() {
    return tokens[current];
  }

  function consume(type) {
    const token = tokens[current];
    if (!token) throw new Error(`Unexpected end of input, expected ${type}`);
    if (token.type !== type) throw new Error(`Expected token type ${type}, got ${token.type}`);
    current++;
    return token;
  }

  function parseProgram() {
    const body = [];
    while (current < tokens.length) {
      body.push(parseStatement());
    }
    return { type: 'Program', body };
  }

  function parseStatement() {
    const token = peek();

    if (token.type === 'MILTVAR') return parseVariableDeclaration();
    if (token.type === 'FUNC') return parseFunctionDeclaration();
    if (token.type === 'IF') return parseIfStatement();
    if (token.type === 'WHILE') return parseWhileStatement();
    if (token.type === 'MESSAGE') return parseMessageStatement();
    if (token.type === 'SHOUT') return parseShoutStatement();
    if (token.type === 'RETURN') return parseReturnStatement();

    return parseExpressionStatement();
  }

  function parseVariableDeclaration() {
    consume('MILTVAR');
    const id = consume('IDENTIFIER');
    consume('EQUAL');
    const init = parseExpression();
    return { type: 'VariableDeclaration', id: id.value, init };
  }

  function parseFunctionDeclaration() {
    consume('FUNC');
    const id = consume('IDENTIFIER');
    consume('LPAREN');
    const params = [];
    while (peek().type !== 'RPAREN') {
      params.push(consume('IDENTIFIER').value);
      if (peek().type === 'COMMA') consume('COMMA');
    }
    consume('RPAREN');
    consume('LBRACE');
    const body = [];
    while (peek().type !== 'RBRACE') {
      body.push(parseStatement());
    }
    consume('RBRACE');
    return { type: 'FunctionDeclaration', id: id.value, params, body };
  }

  function parseIfStatement() {
    consume('IF');
    consume('LPAREN');
    const test = parseExpression();
    consume('RPAREN');
    consume('LBRACE');
    const consequent = [];
    while (peek().type !== 'RBRACE') {
      consequent.push(parseStatement());
    }
    consume('RBRACE');

    let alternate = null;
    if (peek() && peek().type === 'ELSE') {
      consume('ELSE');
      consume('LBRACE');
      const altBody = [];
      while (peek().type !== 'RBRACE') {
        altBody.push(parseStatement());
      }
      consume('RBRACE');
      alternate = altBody;
    }

    return { type: 'IfStatement', test, consequent, alternate };
  }

  function parseWhileStatement() {
    consume('WHILE');
    consume('LPAREN');
    const test = parseExpression();
    consume('RPAREN');
    consume('LBRACE');
    const body = [];
    while (peek().type !== 'RBRACE') {
      body.push(parseStatement());
    }
    consume('RBRACE');
    return { type: 'WhileStatement', test, body };
  }

  function parseMessageStatement() {
    consume('MESSAGE');
    consume('LPAREN');
    const args = [];
    while (peek().type !== 'RPAREN') {
      if (peek().type === 'STRING' || peek().type === 'NUMBER' || peek().type === 'IDENTIFIER') {
        args.push(consume(peek().type).value);
      } else {
        throw new Error('Unexpected token in message arguments: ' + peek().type);
      }
      if (peek().type === 'COMMA') consume('COMMA');
    }
    consume('RPAREN');
    return { type: 'MessageStatement', args };
  }

  function parseShoutStatement() {
    consume('SHOUT');
    consume('LPAREN');
    const arg = consume('STRING').value;
    consume('RPAREN');
    return { type: 'ShoutStatement', arg };
  }

  function parseReturnStatement() {
    consume('RETURN');
    const argument = parseExpression();
    return { type: 'ReturnStatement', argument };
  }

  function parseExpressionStatement() {
    const expr = parseExpression();
    return { type: 'ExpressionStatement', expression: expr };
  }

  function parseExpression() {
    return parseEquality();
  }

  function parseEquality() {
    let left = parseComparison();

    while (peek() && (peek().type === 'EQUAL_EQUAL' || peek().type === 'NOT_EQUAL')) {
      const operator = consume(peek().type).type;
      const right = parseComparison();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  function parseComparison() {
    let left = parseTerm();

    while (peek() && ['GREATER', 'LESS', 'GTE', 'LTE'].includes(peek().type)) {
      const operator = consume(peek().type).type;
      const right = parseTerm();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  function parseTerm() {
    let left = parseFactor();

    while (peek() && (peek().type === 'PLUS' || peek().type === 'MINUS')) {
      const operator = consume(peek().type).type;
      const right = parseFactor();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  function parseFactor() {
    let left = parseUnary();

    while (peek() && (peek().type === 'MULTIPLY' || peek().type === 'DIVIDE')) {
      const operator = consume(peek().type).type;
      const right = parseUnary();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'MINUS') {
      consume('MINUS');
      const argument = parseUnary();
      return { type: 'UnaryExpression', operator: '-', argument };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Unexpected end of input');

    if (token.type === 'NUMBER') {
      consume('NUMBER');
      return { type: 'Literal', value: Number(token.value) };
    }
    if (token.type === 'STRING') {
      consume('STRING');
      // Remove quotes
      const strVal = token.value.slice(1, -1);
      return { type: 'Literal', value: strVal };
    }
    if (token.type === 'IDENTIFIER') {
      consume('IDENTIFIER');
      if (peek() && peek().type === 'LPAREN') {
        // function call
        consume('LPAREN');
        const args = [];
        while (peek().type !== 'RPAREN') {
          args.push(parseExpression());
          if (peek().type === 'COMMA') consume('COMMA');
        }
        consume('RPAREN');
        return { type: 'CallExpression', callee: token.value, arguments: args };
      }
      return { type: 'Identifier', name: token.value };
    }
    if (token.type === 'LPAREN') {
      consume('LPAREN');
      const expr = parseExpression();
      consume('RPAREN');
      return expr;
    }

    throw new Error('Unexpected token: ' + token.type);
  }

  return parseProgram();
}

module.exports = { parseMiltov };