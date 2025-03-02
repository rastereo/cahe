const specialCharacters: { [key: string]: string } = {
  // Знаки авторского права и регистрации
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',

  // Символы валют
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '¢': '&cent;',
  '₿': '&#8383;',

  // Символы пунктуации
  '§': '&sect;', // Символ параграфа
  '¶': '&para;', // Символ абзаца
  '•': '&bull;', // Символ маркера списка
  '…': '&hellip;', // Многоточие
  '—': '&mdash;', // Длинное тире
  '–': '&ndash;', // Короткое тире

  // Кавычки и апострофы
  '“': '&ldquo;', // Левая двойная кавычка
  '”': '&rdquo;', // Правая двойная кавычка
  '‘': '&lsquo;', // Левая одинарная кавычка
  '’': '&rsquo;', // Правая одинарная кавычка

  // Буквы с диакритическими знаками
  á: '&aacute;',
  é: '&eacute;',
  í: '&iacute;',
  ó: '&oacute;',
  ú: '&uacute;',
  ñ: '&ntilde;',
  Á: '&Aacute;',
  É: '&Eacute;',
  Í: '&Iacute;',
  Ó: '&Oacute;',
  Ú: '&Uacute;',
  Ñ: '&Ntilde;',
  à: '&agrave;',
  è: '&egrave;',
  ì: '&igrave;',
  ò: '&ograve;',
  ù: '&ugrave;',
  À: '&Agrave;',
  È: '&Egrave;',
  Ì: '&Igrave;',
  Ò: '&Ograve;',
  Ù: '&Ugrave;',
  â: '&acirc;',
  ê: '&ecirc;',
  î: '&icirc;',
  ô: '&ocirc;',
  û: '&ucirc;',
  Â: '&Acirc;',
  Ê: '&Ecirc;',
  Î: '&Icirc;',
  Ô: '&Ocirc;',
  Û: '&Ucirc;',
  ã: '&atilde;',
  õ: '&otilde;',
  Ã: '&Atilde;',
  Õ: '&Otilde;',
  ä: '&auml;',
  ë: '&euml;',
  ï: '&iuml;',
  ö: '&ouml;',
  ü: '&uuml;',
  Ä: '&Auml;',
  Ë: '&Euml;',
  Ï: '&Iuml;',
  Ö: '&Ouml;',
  Ü: '&Uuml;',
  ÿ: '&yuml;',
  Ÿ: '&Yuml;',
  å: '&aring;',
  Å: '&Aring;',
  æ: '&aelig;',
  Æ: '&AElig;',
  œ: '&oelig;',
  Œ: '&OElig;',
  ç: '&ccedil;',
  Ç: '&Ccedil;',
  ð: '&eth;',
  Ð: '&ETH;',
  ø: '&oslash;',
  Ø: '&Oslash;',
  þ: '&thorn;',
  Þ: '&THORN;',
  ß: '&szlig;',

  // Греческие буквы
  α: '&alpha;',
  β: '&beta;',
  γ: '&gamma;',
  δ: '&delta;',
  ε: '&epsilon;',
  ζ: '&zeta;',
  η: '&eta;',
  θ: '&theta;',
  ι: '&iota;',
  κ: '&kappa;',
  λ: '&lambda;',
  μ: '&mu;',
  ν: '&nu;',
  ξ: '&xi;',
  ο: '&omicron;',
  π: '&pi;',
  ρ: '&rho;',
  σ: '&sigma;',
  τ: '&tau;',
  υ: '&upsilon;',
  φ: '&phi;',
  χ: '&chi;',
  ψ: '&psi;',
  ω: '&omega;',
  Α: '&Alpha;',
  Β: '&Beta;',
  Γ: '&Gamma;',
  Δ: '&Delta;',
  Ε: '&Epsilon;',
  Ζ: '&Zeta;',
  Η: '&Eta;',
  Θ: '&Theta;',
  Ι: '&Iota;',
  Κ: '&Kappa;',
  Λ: '&Lambda;',
  Μ: '&Mu;',
  Ν: '&Nu;',
  Ξ: '&Xi;',
  Ο: '&Omicron;',
  Π: '&Pi;',
  Ρ: '&Rho;',
  Σ: '&Sigma;',
  Τ: '&Tau;',
  Υ: '&Upsilon;',
  Φ: '&Phi;',
  Χ: '&Chi;',
  Ψ: '&Psi;',
  Ω: '&Omega;',

  // Математические операторы и символы
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '≤': '&le;',
  '≥': '&ge;',
  '≠': '&ne;',
  '≈': '&asymp;',
  '∞': '&infin;',
  '√': '&radic;',
  '∫': '&int;',
  '∑': '&sum;',
  '∏': '&prod;',
  '∂': '&part;',
  '∇': '&nabla;',
  '∈': '&isin;',
  '∩': '&cap;',
  '∪': '&cup;',
  '⊂': '&sub;',
  '⊃': '&sup;',
  '⊆': '&sube;',
  '⊇': '&supe;',
  '⊕': '&oplus;',
  '⊗': '&otimes;',
  '∅': '&empty;',

  // Логические операторы
  '¬': '&not;',
  '∧': '&and;',
  '∨': '&or;',

  // Прочие символы
  '°': '&deg;', // Градус
  µ: '&micro;', // Микро
  '¤': '&curren;', // Общий символ валюты
  '†': '&dagger;', // Кинжал (dagger)
  '‡': '&Dagger;', // Двойной кинжал (double dagger)
  '‾': '&oline;', // Верхняя линия (overline)
  '‰': '&permil;', // Промилле
  '¦': '&brvbar;', // Разделительная линия
  '‹': '&lsaquo;', // Левая угловая скобка
  '›': '&rsaquo;', // Правая угловая скобка
  '«': '&laquo;', // Левая двойная угловая скобка
  '»': '&raquo;', // Правая двойная угловая скобка
  '¿': '&iquest;', // Перевернутый вопросительный знак

  '¡': '&iexcl;', // Перевернутый восклицательный знак
  '◊': '&loz;', // Ромб (lozenge)
  '○': '&cir;', // Круг
  '◌': '&om;', // Пустой круг
  '★': '&starf;', // Заполненная звезда
  '☆': '&star;', // Пустая звезда
  '♠️': '&spades;', // Пики
  '♣️': '&clubs;', // Трефы
  '♥️': '&hearts;', // Червы
  '♦️': '&diams;', // Бубны

  // Стрелки
  '←': '&larr;', // Левая стрелка
  '↑': '&uarr;', // Верхняя стрелка
  '→': '&rarr;', // Правая стрелка"
  '↓': '&darr;', // Нижняя стрелка
  '↔️': '&harr;', // Двусторонняя стрелка
  '↕️': '&varr;', // Вертикальная двусторонняя стрелка
  '↩️': '&larrtl;', // Левая крюковая стрелка
  '↪️': '&rarrtl;', // Правая крюковая стрелка
  '↵': '&crarr;', // Символ новой строки
  '↶': '&cularr;', // Левая круговая стрелка
  '↷': '&curarr;', // Правая круговая стрелка
  '⇐': '&lArr;', // Левая двойная стрелка
  '⇑': '&uArr;', // Верхняя двойная стрелка
  '⇒': '&rArr;', // Правая двойная стрелка
  '⇓': '&dArr;', // Нижняя двойная стрелка
  '⇔': '&hArr;', // Двусторонняя двойная стрелка
  '⇕': '&vArr;', // Вертикальная двусторонняя двойная стрелка

  '№': '&#8470;',
};

export default specialCharacters;
