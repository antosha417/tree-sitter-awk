module.exports = grammar({
  name: 'awk',

  extras: $ => [$.comment, /[\s\t]/],

  precedences: $ => [
    [
      'field_ref',
      'call',
      'increment',
      'binary_exponent',
      // TODO: Handle 1 + 1 to be a binary exp
      'unary_not',
      'binary_times',
      'binary_plus',
      'binary_io',
      'binary_relation',
      'binary_match',
      'binary_in',
      'binary_and',
      'binary_or',
      'ternary',
    ],
  ],

  word: $ => $.identifier,

  rules: {
    program: $ => repeat(choice($.rule, $.func_def)),

    rule: $ =>
      prec.left(choice(seq($.pattern, optional($.block)), seq(optional($.pattern), $.block))),

    // TODO: Need more thought
    pattern: $ => prec.left(choice($._exp, seq($._exp, ',', $._exp), $.regex, $._special_pattern)),

    _special_pattern: $ => choice('BEGIN', 'END', 'BEGINFILE', 'ENDFILE'),

    _statement: $ => choice($._control_statement, $._io_statement),

    _statement_sep: $ => choice(';', '\n'),

    _control_statement: $ =>
      choice(
        $.if_statement,
        $.while_statement,
        $.do_while_statement,
        $.for_statement,
        $.for_in_statement,
        $.break_statement,
        $.continue_statement,
        $.delete_statement,
        $.exit_statement,
        $.switch_statement
      ),

    if_statement: $ =>
      prec.right(
        seq(
          'if',
          field('condition', seq('(', $._exp, ')')),
          choice($.block, seq($._statement, $._statement_sep)),
          optional($.else_clause)
        )
      ),

    else_clause: $ => seq('else', choice($.block, $._statement)),

    while_statement: $ => seq('while', field('condition', seq('(', $._exp, ')')), $.block),

    do_while_statement: $ => seq('do', $.block, 'while', field('condition', seq('(', $._exp, ')'))),

    for_statement: $ =>
      seq('for', '(', /* TODO: initializer, condition, advancement */ ')', $.block),

    for_in_statement: $ => 'todo_for_in_statement',

    // TODO: Must be available in loops only
    break_statement: $ => 'break',

    continue_statement: $ => 'continue',

    delete_statement: $ => 'todo_delete_statement',

    exit_statement: $ => 'todo_exit_statement',

    switch_statement: $ => 'todo_switch_statement',

    _io_statement: $ => 'todo_io_statement',

    block: $ => seq('{', repeat(prec.left(choice($.block, $._statement, $._exp, $.regex))), '}'),

    _exp: $ =>
      choice(
        $.identifier,
        $.ternary_exp,
        $.binary_exp,
        $.unary_exp,
        $.update_exp,
        $.assignment_exp,
        $.field_ref,
        $.func_call,
        $._primitive
      ),

    ternary_exp: $ =>
      prec.right(
        'ternary',
        seq(
          field('condition', $._exp),
          '?',
          field('consequence', $._exp),
          ':',
          field('alternative', $._exp)
        )
      ),

    binary_exp: $ =>
      choice(
        ...[
          ['^', 'binary_exponent'],
          ['**', 'binary_exponent'],
          ['*', 'binary_times'],
          ['/', 'binary_times'],
          ['%', 'binary_times'],
          ['+', 'binary_plus'],
          ['-', 'binary_plus'],
          ['|', 'binary_io'],
          ['|&', 'binary_io'],
          ['<', 'binary_relation'],
          ['>', 'binary_relation'],
          ['<=', 'binary_relation'],
          ['>=', 'binary_relation'],
          ['==', 'binary_relation'],
          ['!=', 'binary_relation'],
          ['~', 'binary_match'],
          ['!~', 'binary_match'],
          ['in', 'binary_in'],
          ['&&', 'binary_and'],
          ['||', 'binary_or'],
        ].map(([op, precedence]) =>
          prec.left(
            precedence,
            seq(field('left', $._exp), field('operator', op), field('right', $._exp))
          )
        )
      ),

    unary_exp: $ =>
      choice(
        ...[
          ['!', 'unary_not'],
          ['+', 'unary_not'],
          ['-', 'unary_not'],
        ].map(([op, precedence]) =>
          prec.left(precedence, seq(field('operator', op), field('argument', $._exp)))
        )
      ),

    update_exp: $ =>
      prec.left(
        'increment',
        choice(
          seq(field('argument', $._exp), field('operator', choice('++', '--'))),
          seq(field('operator', choice('++', '--')), field('argument', $._exp))
        )
      ),

    assignment_exp: $ =>
      prec.right(
        seq(
          field('left', $.identifier),
          choice('=', '+=', '-=', '*=', '/=', '%=', '^='),
          field('right', $._exp)
        )
      ),

    field_ref: $ => prec('field_ref', seq('$', $._exp)),

    regex: $ => 'todo_regex',

    _primitive: $ => choice($.number, $.string),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+/,

    string: $ => seq('"', repeat(choice(/[^"\\]+/, $.escape_sequence)), '"'),

    // prettier-ignore
    escape_sequence: $ =>
      token.immediate(seq(
        '\\',
        choice(
          /[\\abfnrtv]/,
          /x[0-9a-fA-F]{1,2}/,
          /[0-7]{1,3}/
        )
      )),

    func_def: $ =>
      seq('function', field('name', $.identifier), '(', optional($.param_list), ')', $.block),

    param_list: $ => seq($.identifier, repeat(seq(',', $.identifier))),

    func_call: $ => prec('call', seq(field('func_name', $.identifier), '(', optional($.args), ')')),

    args: $ => seq($._exp, repeat(seq(',', $._exp))),

    comment: $ => seq('#', /.*/),
  },
});
