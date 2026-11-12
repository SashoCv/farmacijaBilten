/**
 * Macedonian interface strings, keyed by the English text.
 * Missing keys fall back to English (see resources/js/lib/i18n.ts).
 */
const mk: Record<string, string> = {
    // Navigation and layout
    About: 'За списанието',
    'For authors': 'За автори',
    'Current issue': 'Тековен број',
    Archive: 'Архива',
    'Early online': 'Предвремено објавени',
    Contact: 'Контакт',
    'Submit manuscript': 'Поднеси ракопис',
    'Search the journal': 'Пребарај го списанието',
    'Close search': 'Затвори пребарување',
    'Open menu': 'Отвори мени',
    'Close menu': 'Затвори мени',
    Main: 'Главна навигација',
    Language: 'Јазик',
    Footer: 'Подножје',
    Home: 'Почетна',
    'Skip to content': 'Прескокни до содржината',
    'Published by the Macedonian Pharmaceutical Association with the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje':
        'Издавач: Македонско фармацевтско друштво во соработка со Фармацевтскиот факултет при Универзитетот „Св. Кирил и Методиј“ во Скопје',
    'Published by the Macedonian Pharmaceutical Association in cooperation with the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.':
        'Го издава Македонското фармацевтско друштво во соработка со Фармацевтскиот факултет при Универзитетот „Св. Кирил и Методиј“ во Скопје.',
    'Published by the Macedonian Pharmaceutical Association with the Faculty of Pharmacy, Skopje.':
        'Го издава Македонското фармацевтско друштво со Фармацевтскиот факултет во Скопје.',
    Journal: 'Списание',
    Authors: 'Автори',
    'Faculty of Pharmacy, Ss. Cyril and Methodius University':
        'Фармацевтски факултет, Универзитет „Св. Кирил и Методиј“',
    'Majka Tereza 47, 1000 Skopje': 'Мајка Тереза 47, 1000 Скопје',
    'All contact details': 'Сите контакт податоци',
    '© {year} Macedonian Pharmaceutical Association':
        '© {year} Македонско фармацевтско друштво',
    'Open access. Indexed in DOAJ and EBSCO.':
        'Отворен пристап. Индексирано во DOAJ и EBSCO.',
    print: 'печатено',
    online: 'онлајн',

    // Editorial pages (menu)
    'Instructions for authors': 'Упатство за автори',
    'Editorial policies': 'Уредувачка политика',
    'Review policies': 'Политика за рецензирање',
    'Open access policy': 'Политика за отворен пристап',
    'Article processing charges': 'Трошоци за обработка на трудови',
    'Forms and downloads': 'Обрасци за преземање',
    'Aims and scope': 'Цели и опфат',
    'Editorial board': 'Уредувачки одбор',
    'Editor’s words': 'Збор од уредникот',

    // Search
    Search: 'Пребарај',
    'Search articles, authors and keywords':
        'Пребарај трудови, автори и клучни зборови',
    'e.g. HPLC, pharmacokinetics, Dimovski':
        'на пр. HPLC, pharmacokinetics, Dimovski',
    'Search the Bulletin': 'Пребарување на Билтенот',
    Results: 'Резултати',
    '1 result for': '1 резултат за',
    '{count} results for': '{count} резултата за',
    'First {count} results for': 'Првите {count} резултата за',
    'Nothing matched. Try an author’s surname or a single keyword.':
        'Нема резултати. Обидете се со презимето на авторот или со еден клучен збор.',
    'Search titles and author names across every issue.':
        'Пребарувајте наслови и имиња на автори низ сите броеви.',

    // Home
    'Peer-reviewed pharmaceutical science': 'Рецензирана фармацевтска наука',
    'Peer-reviewed pharmaceutical science, open to every reader.':
        'Рецензирана фармацевтска наука, достапна за секој читател.',
    'Macedonian Pharmaceutical Bulletin: an open-access, peer-reviewed international journal of the Macedonian Pharmaceutical Association and the Faculty of Pharmacy in Skopje.':
        'Македонски фармацевтски билтен: меѓународно рецензирано списание со отворен пристап на Македонското фармацевтско друштво и Фармацевтскиот факултет во Скопје.',
    'An international journal of the Macedonian Pharmaceutical Association, published in cooperation with the Faculty of Pharmacy in Skopje.':
        'Меѓународно списание на Македонското фармацевтско друштво, кое излегува во соработка со Фармацевтскиот факултет во Скопје.',
    'Every article is free to read and download.':
        'Секој труд е бесплатен за читање и преземање.',
    '{count} articles early online': '{count} предвремено објавени труда',
    '{issue}, table of contents': '{issue}, содржина',
    '{count} articles, published online {span}':
        '{count} труда, објавени онлајн {span}',
    '{count} articles, {span}': '{count} труда, {span}',
    'View table of contents': 'Види ја содржината',
    'In this issue': 'Во овој број',
    'Current issue, published online {span}':
        'Тековен број, објавен онлајн {span}',
    'All {count}': 'Сите {count}',
    'All {count} articles': 'Сите {count} труда',
    'Indexing and identifiers': 'Индексирање и идентификатори',
    'Indexed in': 'Индексирано во',
    'DOAJ and EBSCO': 'DOAJ и EBSCO',
    'Directory of Open Access Journals; Academic Search':
        'Directory of Open Access Journals; Academic Search',
    'Print ISSN': 'ISSN (печатено)',
    'Online ISSN': 'ISSN (онлајн)',
    Access: 'Пристап',
    'Open access': 'Отворен пристап',
    'Free to read and download': 'Бесплатно за читање и преземање',
    '{congress} congress contributions': 'Прилози од конгресот {congress}',
    '{count} contributions, each one available as its own PDF.':
        '{count} прилога, секој достапен како посебен PDF.',
    'Browse the supplement': 'Прегледај го додатокот',
    'Browse all {count} contributions': 'Прегледајте ги сите {count} прилога',
    'Full supplement': 'Цел додаток',
    'Contribution {number}': 'Прилог {number}',
    'Pharmaceutical sciences and the fields around them':
        'Фармацевтските науки и сродните области',
    'Original research articles, review papers, short communications, case studies and professional studies, in basic and applied sciences.':
        'Оригинални научни трудови, прегледни трудови, кратки соопштенија, прикази на случаи и стручни трудови од базичните и применетите науки.',
    'Read the aims and scope': 'Прочитајте ги целите и опфатот',
    'From the editor': 'Од уредникот',
    'The Bulletin’s mission is to be the premier periodical on basic pharmacy concepts and recent developments in pharmacy, promoting research, postgraduate training and progress in pharmacy, medicine, dental medicine and the life sciences.':
        'Мисијата на Билтенот е да биде водечко списание за основните концепти и најновите достигнувања во фармацијата, кое ги поттикнува истражувањата, последипломското образование и напредокот во фармацијата, медицината, стоматологијата и науките за животот.',
    'Prof. Marija Glavas Dodov': 'Проф. д-р Марија Главаш Додов',
    'Editor-in-Chief': 'Главен уредник',
    'From the editor’s words': 'Од зборот на уредникот',
    'Read the full editorial': 'Прочитајте го целиот збор од уредникот',
    'Publish with the Bulletin': 'Објавете во Билтенот',
    'Everything you need from first draft to submission, in one place.':
        'Сè што ви треба, од прв нацрт до поднесување, на едно место.',
    'Submit your paper': 'Поднесете труд',
    'Author guidelines': 'Упатства за автори',
    'Editorial and review policies': 'Уредувачка политика и рецензирање',
    'Manuscript structure, formatting and reference style.':
        'Структура на ракописот, форматирање и начин на цитирање.',
    'How manuscripts are handled, from submission to decision.':
        'Како се обработуваат ракописите, од поднесување до одлука.',
    'Current fees and how payment works.':
        'Тековни надоместоци и начин на плаќање.',
    'Author disclosure and ethical responsibility forms.':
        'Изјава на авторите и образец за етичка одговорност.',
    'Read the instructions': 'Прочитајте го упатството',
    'Read the policies': 'Прочитајте ја политиката',
    'See the charges': 'Видете ги трошоците',
    'Go to downloads': 'Кон обрасците',
    'Every volume, back to Volume 47': 'Сите томови, наназад до Том 47',
    'Browse the full archive': 'Прегледајте ја целата архива',
    Volume: 'Том',

    // Subject areas
    Pharmaceutics: 'Фармацевтика',
    'Pharmaceutical chemistry': 'Фармацевтска хемија',
    'Pharmaceutical analysis': 'Фармацевтска анализа',
    'Pharmaceutical technology': 'Фармацевтска технологија',
    Pharmacology: 'Фармакологија',
    Toxicology: 'Токсикологија',
    'Clinical pharmacy': 'Клиничка фармација',
    'Pharmacy practice': 'Фармацевтска пракса',
    Pharmacognosy: 'Фармакогнозија',
    Phytotherapy: 'Фитотерапија',
    Biotechnology: 'Биотехнологија',
    Immunology: 'Имунологија',
    Nutrition: 'Исхрана',
    Cosmetology: 'Козметологија',
    Medicine: 'Медицина',
    'Dental medicine': 'Стоматологија',

    // Issue page
    'Early online: articles published ahead of the issue':
        'Предвремено објавени: трудови објавени пред излегувањето на бројот',
    Supplement: 'Додаток',
    'Published {year}': 'Објавено {year}',
    Contributions: 'Прилози',
    Articles: 'Трудови',
    articles: 'трудови',
    contributions: 'прилози',
    'Published online': 'Објавено онлајн',
    Year: 'Година',
    'Book of Abstracts (PDF)': 'Зборник на апстракти (PDF)',
    'Download issue (PDF)': 'Преземи го бројот (PDF)',
    'Contents (PDF)': 'Содржина (PDF)',
    'Issue citation copied': 'Цитатот на бројот е копиран',
    'Cite this issue': 'Цитирај го бројот',
    'Table of contents': 'Содржина',
    'Issue navigation': 'Навигација низ броеви',
    'Search this issue': 'Пребарај во овој број',
    'Title or author': 'Наслов или автор',
    'Browse issues': 'Прегледај броеви',
    'All issues': 'Сите броеви',
    '{matches} of {count} {unit}': '{matches} од {count} {unit}',
    Sort: 'Подреди',
    'Table of contents order': 'По редослед во содржината',
    'Newest online first': 'Најнови онлајн прво',
    'Loading more {unit}…': 'Се вчитуваат уште {unit}…',
    '{issue} is available as a single PDF.':
        '{issue} е достапен како еден PDF.',
    'The contents of this issue are not available online.':
        'Содржината на овој број не е достапна онлајн.',
    'Open the PDF': 'Отвори го PDF-от',
    'No {unit} in this issue match “{query}”.':
        'Нема {unit} во овој број што одговараат на „{query}“.',

    // Article rows and article page
    Abstract: 'Апстракт',
    Cite: 'Цитирај',
    'Citation copied': 'Цитатот е копиран',
    'Link copied': 'Линкот е копиран',
    'Published online {date}': 'Објавено онлајн {date}',
    'More by {author}': 'Други трудови од {author}',
    'Show affiliations': 'Прикажи афилијации',
    'Hide affiliations': 'Скриј афилијации',
    'Volume (issue)': 'Том (број)',
    Pages: 'Страници',
    'Article sections': 'Делови од трудот',
    'Full text': 'Целосен текст',
    'Short communications are published without a separate abstract. The full text is in the PDF.':
        'Кратките соопштенија се објавуваат без посебен апстракт. Целосниот текст е во PDF-от.',
    'The full text of this article is available as a PDF.':
        'Целосниот текст на трудот е достапен како PDF.',
    'Read the PDF': 'Прочитај го PDF-от',
    Keywords: 'Клучни зборови',
    'How to cite': 'Како да се цитира',
    'Copy citation': 'Копирај цитат',
    References: 'Референци',
    'Article tools': 'Алатки за трудот',
    'Download PDF': 'Преземи PDF',
    Share: 'Сподели',
    'Article information': 'Информации за трудот',
    Issue: 'Број',
    Article: 'Труд',
    Licence: 'Лиценца',
    'Full table of contents': 'Целосна содржина',

    // Article types (from the PDFs and the submission form)
    'Original scientific paper': 'Оригинален научен труд',
    'Original research paper': 'Оригинален научен труд',
    'Review paper': 'Прегледен труд',
    Review: 'Прегледен труд',
    'Short communication': 'Кратко соопштение',
    'Professional paper': 'Стручен труд',
    'Case report': 'Приказ на случај',
    'Case study': 'Приказ на случај',

    // Archive and early online
    'Every volume of the Macedonian Pharmaceutical Bulletin, free to read and download.':
        'Сите томови на Македонскиот фармацевтски билтен, бесплатни за читање и преземање.',
    '{count} issues, back to Volume {volume} ({year}). Every article is free to read and download.':
        '{count} броја, наназад до Том {volume} ({year}). Секој труд е бесплатен за читање и преземање.',
    'Volume {list} is not available online.':
        'Том {list} не е достапен онлајн.',
    'Volumes {list} are not available online.':
        'Томовите {list} не се достапни онлајн.',
    'Jump to volume': 'Скокни до том',
    'Complete volume': 'Цел том',
    'Single PDF': 'Еден PDF',
    'Full PDF': 'Цел PDF',
    'Accepted articles published online ahead of their issue in the Macedonian Pharmaceutical Bulletin.':
        'Прифатени трудови објавени онлајн пред излегувањето на бројот во Македонскиот фармацевтски билтен.',
    'Accepted articles, published online ahead of the issue they will appear in.':
        'Прифатени трудови, објавени онлајн пред излегувањето на бројот во кој ќе бидат вклучени.',
    'There are no early-online articles at the moment.':
        'Моментално нема предвремено објавени трудови.',
    '{count} articles': '{count} труда',

    'This page is currently available in English only.':
        'Оваа страница засега е достапна само на англиски.',

    // Submission form
    'Thank you, your manuscript has been received.':
        'Ви благодариме, вашиот ракопис е примен.',
    'Your reference is {reference}. A confirmation has been sent to your e-mail address.':
        'Вашиот референтен број е {reference}. Потврда е испратена на вашата е-пошта.',
    'Before you submit, please read the': 'Пред да поднесете, прочитајте го',
    'instructions for authors': 'упатството за автори',
    'and include the signed': 'и приложете ги потпишаните',
    'disclosure and ethical responsibility forms':
        'изјава на авторите и образец за етичка одговорност',
    'Corresponding author': 'Автор за кореспонденција',
    'E-mail': 'Е-пошта',
    Affiliation: 'Афилијација',
    optional: 'незадолжително',
    'Manuscript title': 'Наслов на ракописот',
    'Type of paper': 'Тип на труд',
    'Choose a type': 'Изберете тип',
    'Manuscript file': 'Датотека со ракописот',
    'Word, PDF, ODT or RTF, up to {size} MB. Put figures and tables in the same file.':
        'Word, PDF, ODT или RTF, до {size} MB. Сликите и табелите ставете ги во истата датотека.',
    'Message to the editor': 'Порака до уредникот',
    'The work has not been published before and is not under consideration elsewhere, and all authors have approved this submission.':
        'Трудот не е претходно објавен и не е во постапка за објавување на друго место, а сите автори се согласни со поднесувањето.',
    'Sending…': 'Се испраќа…',
    'Questions?': 'Прашања?',
    'Contact the editorial office': 'Контактирајте ја редакцијата',

    // Redesign (2026-11)
    '1 page': '1 страница',
    '{count} pages': '{count} страници',
    'Could not copy. Select the text and copy it manually.':
        'Не може да се копира. Означете го текстот и копирајте го рачно.',
    'Copy link': 'Копирај линк',
    Email: 'Е-пошта',
    'DOI {doi}': 'DOI {doi}',
    'pp. {pages}': 'стр. {pages}',
    'Published {date}': 'Објавено {date}',
    Details: 'Детали',
    'Show {count} affiliations': 'Прикажи {count} афилијации',
    Affiliations: 'Афилијации',
    Breadcrumb: 'Патека',
    'Cite this article': 'Цитирајте го трудот',
    Close: 'Затвори',
    'Citation style': 'Стил на цитирање',
    Copied: 'Копирано',
    'Download for reference managers': 'Преземи за програми за референци',
    'RIS works with EndNote, Mendeley and Zotero; BibTeX with LaTeX and JabRef.':
        'RIS работи со EndNote, Mendeley и Zotero, а BibTeX со LaTeX и JabRef.',
    'The content is available in English only.':
        'Содржината е достапна само на англиски.',
    Draft: 'Нацрт',
    'Ready to submit?': 'Подготвени сте за поднесување?',
    'Read the instructions for authors, prepare the signed forms, then send your manuscript through the online form.':
        'Прочитајте го упатството за автори, подгответе ги потпишаните обрасци и испратете го ракописот преку онлајн формата.',
    'Pages in this section': 'Страници во овој дел',
    Previous: 'Претходна',
    Next: 'Следна',
    '© {year} Macedonian Pharmaceutical Association & Faculty of Pharmacy, UKIM':
        '© {year} Македонско фармацевтско друштво и Фармацевтски факултет, УКИМ',
    'Content licensed under': 'Содржината е лиценцирана под',
    'Design & development:': 'Дизајн и развој:',
    'The Bulletin publishes original research articles, review papers, short communications, case studies and professional studies in basic and applied sciences: the pharmaceutical sciences and related fields of medicine, dental medicine and the life sciences.':
        'Билтенот објавува оригинални научни трудови, прегледни трудови, кратки соопштенија, прикази на случаи и стручни трудови од базичните и применетите науки: фармацевтските науки и сродните области од медицината, стоматологијата и науките за животот.',
    'Browse by topic': 'Прегледајте по тема',
    'Recent issues': 'Последни броеви',
    'Online archive from Volume {volume} ({year})':
        'Онлајн архива од Том {volume} ({year})',
    'Online archive from Volume {volume}': 'Онлајн архива од Том {volume}',
    'All volumes': 'Сите томови',
    Volumes: 'Томови',
    'Volume {volume}': 'Том {volume}',
    'Cover of {issue}': 'Корица на {issue}',
    'Full issue (PDF)': 'Цел број (PDF)',
    'Signature of {name}': 'Потпис на {name}',
    'Read the editor’s words': 'Прочитајте го зборот на уредникот',
    'Title, author or keyword': 'Наслов, автор или клучен збор',
    'Open-access, peer-reviewed journal · since {year}':
        'Рецензирано списание со отворен пристап · од {year}',
    'Open-access, peer-reviewed journal':
        'Рецензирано списание со отворен пристап',
    'Published by the {publisher} in cooperation with the {faculty}.':
        'Го издава {publisher} во соработка со {faculty}.',
    'DOI prefix': 'DOI префикс',
    Frequency: 'Зачестеност',
    'Peer review': 'Рецензија',
    'Publication fee': 'Надоместок за објавување',
    Publisher: 'Издавач',
    'About the journal': 'За списанието',
    'Original research, reviews and professional papers in the pharmaceutical sciences.':
        'Оригинални истражувања, прегледни и стручни трудови од фармацевтските науки.',
    'Journal at a glance': 'Списанието накратко',
    'Accepted articles, published online before their issue is complete.':
        'Прифатени трудови, објавени онлајн пред да биде комплетиран бројот.',
    'All {count} early online articles':
        'Сите {count} предвремено објавени труда',
    '{count} contributions': '{count} прилога',
    'Latest articles': 'Најнови трудови',
    'Browse all {count}': 'Прегледајте ги сите {count}',
    'Full supplement (PDF)': 'Цел додаток (PDF)',
    '{service}: the journal’s record': '{service}: записот на списанието',
    APC: 'Надоместок (APC)',
    'with the {organisation}': 'со {organisation}',
    Contents: 'Содржина',
    'On this page': 'На оваа страница',
    'Download PDF ({facts})': 'Преземи PDF ({facts})',
    'Open in new tab': 'Отвори во нов таб',
    'opens in a new tab': 'се отвора во нов таб',
    'PDF: {title}': 'PDF: {title}',
    'First page of the PDF': 'Прва страница од PDF-от',
    'Tap to read the full PDF': 'Допрете за да го прочитате целиот PDF',
    'Read the full text (PDF)': 'Прочитајте го целиот текст (PDF)',
    'Opens in your browser’s PDF viewer.':
        'Се отвора во прегледувачот на PDF во вашиот прелистувач.',
    'This page is being prepared.': 'Оваа страница е во подготовка.',
    Overview: 'Преглед',
    'In this section': 'Во овој дел',
    'Site footer': 'Подножје на сајтот',
    'Editorial office': 'Редакција',
    'Faculty of Pharmacy, UKIM Skopje': 'Фармацевтски факултет, УКИМ Скопје',
    'Search articles, authors…': 'Пребарај трудови, автори…',
    required: 'задолжително',
    Error: 'Грешка',
    'Your reference number is': 'Вашиот референтен број е',
    'A confirmation has been sent to your e-mail address. Please quote the reference in any correspondence about this manuscript.':
        'Потврда е испратена на вашата е-пошта. Наведувајте го референтниот број во секоја кореспонденција за овој ракопис.',
    'The editorial office will contact you after the initial assessment.':
        'Редакцијата ќе ве контактира по првичната проценка.',
    'Submit another manuscript': 'Поднесете друг ракопис',
    'Please correct the following before sending':
        'Поправете го следново пред да испратите',
    'Written in English; professional papers may be submitted in Macedonian':
        'Напишан на англиски; стручните трудови може да се поднесат на македонски',
    'Not published before and not under consideration elsewhere; approved by all authors':
        'Претходно необјавен и не е во постапка на друго место; одобрен од сите автори',
    'Title page with all authors and affiliations; the corresponding author marked with *':
        'Насловна страница со сите автори и афилијации; авторот за кореспонденција означен со *',
    'Abstract of up to 250 words (100 for short communications), followed by 3–6 keywords':
        'Апстракт до 250 зборови (100 за кратки соопштенија), со 3–6 клучни зборови',
    'Work with humans or animals follows the ethical standards stated in the instructions':
        'Истражувањата со луѓе или животни ги следат етичките стандарди наведени во упатството',
    'Signed Author Disclosure and Ethical Responsibility forms':
        'Потпишана изјава на авторите и образец за етичка одговорност',
    'Names, institutions and e-mail addresses of 3 potential reviewers':
        'Имиња, институции и е-пошта на 3 потенцијални рецензенти',
    'Before you submit': 'Пред да поднесете',
    'Check your manuscript': 'Проверете го ракописот',
    'Read the instructions for authors': 'Прочитајте го упатството за автори',
    'Article processing charge': 'Надоместок за обработка на трудот',
    'Revised manuscripts': 'Ревидирани ракописи',
    'Returned within 30 days of the reviewers’ comments':
        'Се враќаат во рок од 30 дена од коментарите на рецензентите',
    'Or e-mail your manuscript to': 'Или испратете го ракописот по е-пошта на',
    'The manuscript file must be {size} MB or smaller.':
        'Датотеката со ракописот може да има најмногу {size} MB.',
    'Attach at most {count} signed forms.':
        'Приложете најмногу {count} потпишани обрасци.',
    'Each signed form must be {size} MB or smaller.':
        'Секој потпишан образец може да има најмногу {size} MB.',
    'Submission form': 'Образец за поднесување',
    'Fields marked {link} are required.':
        'Полињата означени со {link} се задолжителни.',
    'Full name': 'Име и презиме',
    'Institution, city and country.': 'Институција, град и држава.',
    Manuscript: 'Ракопис',
    'Signed forms': 'Потпишани обрасци',
    'Author Disclosure Form and Ethical Responsibility Form, signed, as PDF or Word (.docx), up to {size} MB each. Download the blank forms from {link}.':
        'Изјавата на авторите и образецот за етичка одговорност, потпишани, како PDF или Word (.docx), до {size} MB секој. Празните обрасци преземете ги од {link}.',
    'Reviewers and message': 'Рецензенти и порака',
    'Suggested reviewers (3)': 'Предложени рецензенти (3)',
    'One per line: name, institution and e-mail address. The editor decides whether to invite them.':
        'Секој во посебен ред: име, институција и е-пошта. Уредникот одлучува дали ќе ги покани.',
    Declarations: 'Изјави',
    'I have read the {link}.': 'Ја прочитав {link}.',
    'privacy notice': 'изјавата за приватност',
    'Upload progress': 'Напредок на прикачувањето',
    'Editorial office sign-in': 'Најава за редакцијата',
    'Accounts are for the editorial office only. Authors submit manuscripts without an account.':
        'Сметките се само за редакцијата. Авторите поднесуваат ракописи без сметка.',
    'Back to the journal': 'Назад кон списанието',
    'Suggested reviewers': 'Предложени рецензенти',
    'Signed form': 'Потпишан образец',
    Submissions: 'Поднесени ракописи',
    'No submissions to show yet.': 'Сè уште нема поднесени ракописи.',
    '1 manuscript received through the website':
        '1 ракопис примен преку веб-страницата',
    '{count} manuscripts received through the website':
        '{count} ракописи примени преку веб-страницата',
    'Search submissions': 'Пребарај ракописи',
    'Reference, title, author': 'Број, наслов, автор',
    'Export CSV': 'Извези CSV',
    'Manuscripts sent through the submission form appear here, newest first, with links to their files.':
        'Ракописите испратени преку формата се прикажуваат тука, најновите први, со линкови до датотеките.',
    'Open the submission form': 'Отворете ја формата за поднесување',
    '{count} results for “{query}”': '{count} резултата за „{query}“',
    'Showing {from}–{to} of {total}': 'Прикажани {from}–{to} од {total}',
    'Clear search': 'Исчисти пребарување',
    'File links expire after {minutes} minutes; reload the page for new ones.':
        'Линковите до датотеките истекуваат по {minutes} минути; освежете ја страницата за нови.',
    'No submissions match your search.':
        'Нема ракописи што одговараат на пребарувањето.',
    Pagination: 'Страничење',
    Newer: 'Понови',
    'Page {page} of {pages}': 'Страница {page} од {pages}',
    Older: 'Постари',
    'Confirm password': 'Потврдете ја лозинката',
    'Confirm with a passkey': 'Потврдете со клуч за пристап',
    'Confirming…': 'Се потврдува…',
    'Or confirm with your password': 'Или потврдете со лозинка',
    Password: 'Лозинка',
    'Forgot password': 'Заборавена лозинка',
    'E-mail address': 'Адреса на е-пошта',
    'Send reset link': 'Испрати линк за ресетирање',
    'Back to sign-in': 'Назад кон најавата',
    'Log in': 'Најава',
    'Sign in with a passkey': 'Најавете се со клуч за пристап',
    'Signing in…': 'Се најавува…',
    'Or sign in with e-mail': 'Или најавете се со е-пошта',
    'Forgot your password?': 'Ја заборавивте лозинката?',
    'Keep me signed in on this device': 'Остани најавен на овој уред',
    'Sign in': 'Најави се',
    'Reset password': 'Ресетирај лозинка',
    'New password': 'Нова лозинка',
    'Confirm new password': 'Потврдете ја новата лозинка',
    'Two-factor authentication': 'Двофакторска автентикација',
    'Recovery code': 'Код за обновување',
    'Authentication code': 'Код за автентикација',
    Continue: 'Продолжи',
    'E-mail verification': 'Потврда на е-пошта',
    'A new verification link has been sent to the e-mail address of your account.':
        'Нов линк за потврда е испратен на е-поштата на вашата сметка.',
    'Resend verification e-mail': 'Испрати повторно е-пошта за потврда',
    'Log out': 'Одјава',
    'An international, peer-reviewed, open-access journal of the Macedonian Pharmaceutical Association, published in cooperation with the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.':
        'Меѓународно рецензирано списание со отворен пристап на Македонското фармацевтско друштво, кое излегува во соработка со Фармацевтскиот факултет при Универзитетот „Св. Кирил и Методиј“ во Скопје.',
    'Journal facts': 'Податоци за списанието',
    Title: 'Наслов',
    'Title in Macedonian': 'Наслов на македонски',
    Abbreviation: 'Кратенка',
    'In cooperation with': 'Во соработка со',
    Founded: 'Основано',
    'Online archive': 'Онлајн архива',
    'Volume {first} ({firstYear}) to Volume {last} ({lastYear})':
        'Од Том {first} ({firstYear}) до Том {last} ({lastYear})',
    '{issues} issues and supplements, {articles} articles':
        '{issues} броја и додатоци, {articles} труда',
    Languages: 'Јазици',
    'Research papers in English; professional papers may also be in Macedonian.':
        'Научните трудови се на англиски; стручните трудови може да бидат и на македонски.',
    'Indexing and abstracting': 'Индексирање',
    'Policies and people': 'Политики и луѓе',
    'The fields the journal covers and the types of paper it publishes.':
        'Областите што ги опфаќа списанието и типовите трудови што ги објавува.',
    'The editors and the international editorial board of the Macedonian Pharmaceutical Bulletin.':
        'Уредниците и меѓународниот уредувачки одбор на Македонскиот фармацевтски билтен.',
    'Publication ethics': 'Етика на објавување',
    'Publication ethics: the duties of authors, editors and reviewers.':
        'Етика на објавување: обврските на авторите, уредниците и рецензентите.',
    'How published articles can be read and re-used.':
        'Како објавените трудови може да се читаат и повторно користат.',
    'How to reach the editorial office and the publisher.':
        'Како да ги контактирате редакцијата и издавачот.',
    'The printed journal': 'Печатеното списание',
    'Cover of the printed Macedonian Pharmaceutical Bulletin':
        'Корица на печатениот Македонски фармацевтски билтен',
    'Read the journal': 'Читајте го списанието',
    'How accessible this website is, what we know is not yet accessible, and how to ask for another format.':
        'Колку е пристапна оваа веб-страница, што сè уште не е пристапно и како да побарате друг формат.',
    'This statement is a draft awaiting approval by the editors. Details in brackets are still to be confirmed.':
        'Оваа изјава е нацрт што чека одобрување од уредниците. Деталите во загради допрва треба да се потврдат.',
    and: 'и',
    'Issue {number}': 'Број {number}',
    'Supplement {number}': 'Додаток {number}',
    'Book of Abstracts': 'Зборник на апстракти',
    '{count} contribution': '{count} прилог',
    '{count} article': '{count} труд',
    'Issues in progress': 'Броеви во подготовка',
    '{decade}s': '{decade}-ти',
    'Volume {volume} ({year})': 'Том {volume} ({year})',
    View: 'Приказ',
    Covers: 'Корици',
    List: 'Листа',
    'All volumes of the journal': 'Сите томови на списанието',
    Issues: 'Броеви',
    'Per-article PDFs': 'PDF по труд',
    Received: 'Примено',
    Accepted: 'Прифатено',
    Published: 'Објавено',
    'Publication history': 'Историја на објавувањето',
    'DOI (registration pending)': 'DOI (регистрацијата е во тек)',
    'DOI copied': 'DOI е копиран',
    'Copy DOI': 'Копирај DOI',
    'All formats': 'Сите формати',
    'About this article': 'За овој труд',
    'This article is licensed under': 'Овој труд е лиценциран под',
    '1 article': '1 труд',
    'Published in': 'Објавено во',
    'Questions about a manuscript, peer review or a published article? Write to the editorial office.':
        'Прашања за ракопис, рецензија или објавен труд? Пишете ѝ на редакцијата.',
    Phone: 'Телефон',
    'Open in OpenStreetMap': 'Отвори во OpenStreetMap',
    'external site': 'надворешна страница',
    Website: 'Веб-страница',
    'Submit a manuscript': 'Поднесете ракопис',
    'Send your manuscript to the editorial office through the online form.':
        'Испратете го ракописот до редакцијата преку онлајн формата.',
    'E-mail address copied': 'Адресата на е-пошта е копирана',
    'Copy e-mail address': 'Копирај адреса на е-пошта',
    '{count} issue in progress': '{count} број во подготовка',
    '{count} issues in progress': '{count} броја во подготовка',
    'Issue contents': 'Содржина на бројот',
    'About early online': 'За предвремено објавените',
    'What “early online” means': 'Што значи „предвремено објавени“',
    'These articles have been accepted and are published online before their issue is complete.':
        'Овие трудови се прифатени и се објавени онлајн пред да биде комплетиран нивниот број.',
    'Cite an early-online article by its authors, title, journal, year and DOI (where shown). Page numbers are added once they are assigned.':
        'Предвремено објавен труд цитирајте го со авторите, насловот, списанието, годината и DOI (каде што е наведен). Броевите на страниците се додаваат кога ќе бидат доделени.',
    'Use “Cite” on any article for ready-made references.':
        'Користете „Цитирај“ кај секој труд за готови референци.',
    'Follow new articles': 'Следете ги новите трудови',
    'Early online feed': 'Фид на предвремено објавени',
    'Add the feed address to a feed reader to be notified of new articles.':
        'Додајте ја адресата на фидот во читач на фидови за да добивате известувања за нови трудови.',
    '{members} members from {countries} countries.':
        '{members} членови од {countries} држави.',
    'Last updated': 'Последно ажурирано',
    Editors: 'Уредници',
    '{count} members, in alphabetical order': '{count} членови, по азбучен ред',
    'The list is published as provided by the editorial office.':
        'Листата е објавена онака како што ја доставила редакцијата.',
    'Corrections and questions:': 'Исправки и прашања:',
    'The latest table of contents': 'Најновата содржина',
    'All published volumes and issues': 'Сите објавени томови и броеви',
    'Preparing and submitting a manuscript': 'Подготовка и поднесување ракопис',
    'The editorial office': 'Редакцијата',
    'Error {status}': 'Грешка {status}',
    'Browse the archive': 'Прегледајте ја архивата',
    'Try again': 'Обидете се повторно',
    'Useful pages': 'Корисни страници',
    Prepare: 'Подгответе',
    'Follow the instructions for authors: structure, formatting and reference style.':
        'Следете го упатството за автори: структура, форматирање и начин на цитирање.',
    'Sign the forms': 'Потпишете ги обрасците',
    Submit: 'Поднесете',
    'Send the manuscript and the signed forms through the online form.':
        'Испратете ги ракописот и потпишаните обрасци преку онлајн формата.',
    '{model}: referees remain anonymous throughout the process.':
        '{model}: рецензентите остануваат анонимни во текот на целата постапка.',
    'Referees remain anonymous throughout the process.':
        'Рецензентите остануваат анонимни во текот на целата постапка.',
    Publication: 'Објавување',
    'Accepted articles are published open access, online ahead of the issue.':
        'Прифатените трудови се објавуваат со отворен пристап, онлајн пред излегувањето на бројот.',
    'From manuscript to publication': 'Од ракопис до објавување',
    'Step {number}': 'Чекор {number}',
    'Guidelines and policies': 'Упатства и политики',
    'Key facts': 'Клучни податоци',
    'Macedonian Pharmaceutical Bulletin — Open-access peer-reviewed journal':
        'Македонски фармацевтски билтен — рецензирано списание со отворен пристап',
    'The journal’s record in the Directory of Open Access Journals.':
        'Записот на списанието во Directory of Open Access Journals.',
    'The DOIs (digital object identifiers) of the journal’s articles use the prefix {prefix}.':
        'DOI-ата (дигитални идентификатори) на трудовите од списанието го користат префиксот {prefix}.',
    'Where the journal is indexed': 'Каде е индексирано списанието',
    'Search Crossref': 'Пребарај во Crossref',
    'View the journal’s record': 'Видете го записот на списанието',
    Identifiers: 'Идентификатори',
    '{matches} of {count} contributions match “{query}”':
        '{matches} од {count} прилога одговараат на „{query}“',
    '{matches} of {count} articles match “{query}”':
        '{matches} од {count} труда одговараат на „{query}“',
    'Showing {shown} of {total} contributions':
        'Прикажани {shown} од {total} прилога',
    'Showing {shown} of {total} articles': 'Прикажани {shown} од {total} труда',
    'Search this supplement': 'Пребарај во овој додаток',
    'Loading…': 'Се вчитува…',
    'Load more ({count} remaining)': 'Вчитај уште (преостануваат {count})',
    'No contributions in this supplement match “{query}”.':
        'Нема прилози во овој додаток што одговараат на „{query}“.',
    'No articles in this issue match “{query}”.':
        'Нема трудови во овој број што одговараат на „{query}“.',
    'Back to top': 'Назад на врвот',
    'File size': 'Големина на датотеката',
    'Volume year': 'Година на томот',
    'In progress': 'Во подготовка',
    'Download supplement (PDF)': 'Преземи го додатокот (PDF)',
    'Cover page (PDF)': 'Корица (PDF)',
    'Copy citation (English)': 'Копирај цитат (англиски)',
    'Print ISSN {issn}': 'ISSN (печатено) {issn}',
    'Online ISSN {issn}': 'ISSN (онлајн) {issn}',
    'This issue is published as a single PDF; its contributions are not listed separately.':
        'Овој број е објавен како еден PDF; прилозите не се наведени посебно.',
    'Enter a number from 1 to {count}.': 'Внесете број од 1 до {count}.',
    'Go to a contribution by number': 'Одете до прилог според бројот',
    'Go to no.': 'Оди на бр.',
    Go: 'Оди',
    'All issues in the archive': 'Сите броеви во архивата',
    'Copy link to this section': 'Копирај линк до овој дел',
    'More in {section}': 'Повеќе во {section}',
    'Related information': 'Поврзани информации',
    'Sign these forms and include them with your manuscript when you submit it.':
        'Потпишете ги овие обрасци и приложете ги кон ракописот при поднесувањето.',
    Download: 'Преземи',
    'How the Macedonian Pharmaceutical Bulletin handles personal data and cookies.':
        'Како Македонскиот фармацевтски билтен постапува со личните податоци и колачињата.',
    'This notice is a draft awaiting approval by the editors and the publisher. Details in brackets are still to be confirmed.':
        'Оваа изјава е нацрт што чека одобрување од уредниците и издавачот. Деталите во загради допрва треба да се потврдат.',
    'Search results for “{query}”': 'Резултати од пребарувањето за „{query}“',
    'Titles, authors, keywords and abstracts of every article in the archive. Latin and Cyrillic both work, with or without diacritics.':
        'Наслови, автори, клучни зборови и апстракти на сите трудови во архивата. Работи и со латиница и со кирилица, со или без дијакритички знаци.',
    'No results for “{query}”': 'Нема резултати за „{query}“',
    '1 result for “{query}”': '1 резултат за „{query}“',
    'Vol. {volume} ({year})': 'Том {volume} ({year})',
    'Vol. {volume}': 'Том {volume}',
    'No. {number}': 'Бр. {number}',
    'Suppl. {number}': 'Дод. {number}',
    'Vol. {volume} · {year}': 'Том {volume} · {year}',
    'Sort results': 'Подреди ги резултатите',
    'Sort by': 'Подреди според',
    'From {year}': 'Од {year}',
    'Until {year}': 'До {year}',
    'Filtered by': 'Филтрирано според',
    'Remove filter: {filter}': 'Отстрани филтер: {filter}',
    'Clear all': 'Исчисти сè',
    'Filter results': 'Филтрирај ги резултатите',
    'Browse by': 'Прегледај според',
    'Refine results': 'Стесни ги резултатите',
    'Clear filters': 'Исчисти филтри',
    'Issue type': 'Тип на број',
    'Article type': 'Тип на труд',
    'All types': 'Сите типови',
    'Publication year': 'Година на објавување',
    From: 'Од',
    Any: 'Сите',
    To: 'До',
    Apply: 'Примени',
    'Page {page}': 'Страница {page}',
    'No article matched your search. Some suggestions:':
        'Ниту еден труд не одговара на пребарувањето. Неколку предлози:',
    'No article matches these filters.':
        'Ниту еден труд не одговара на овие филтри.',
    'Check the spelling, or try fewer or more general words: a single keyword or an author’s surname.':
        'Проверете го правописот или обидете се со помалку или поопшти зборови: еден клучен збор или презиме на автор.',
    'Latin and Cyrillic both work, with or without diacritics: “č”, “ch” and “ч” find the same words.':
        'Работи и со латиница и со кирилица, со или без дијакритички знаци: „č“, „ch“ и „ч“ ги наоѓаат истите зборови.',
    'Put a phrase in quotation marks to find the words together, e.g. “drug delivery”.':
        'Ставете фраза во наводници за да ги најдете зборовите заедно, на пр. „drug delivery“.',
    'Search again without filters': 'Пребарајте повторно без филтри',
    'Explore subjects from our aims and scope':
        'Истражете ги темите од нашите цели и опфат',
    'Search tips': 'Совети за пребарување',
    'Every word must appear in the title, author names, keywords or abstract, in any order.':
        'Секој збор мора да се појави во насловот, имињата на авторите, клучните зборови или апстрактот, по кој било редослед.',
    'Or browse without a search: choose an issue type, article type or year on this page.':
        'Или прегледајте без пребарување: изберете тип на број, тип на труд или година на оваа страница.',
    // Back-office: accounts and roles (release 1).
    'Manuscript system': 'Систем за ракописи',
    Dashboard: 'Контролна табла',
    'People and roles': 'Луѓе и улоги',
    'Website submissions': 'Ракописи од веб-формата',
    'Journal website': 'Веб-страница на списанието',
    'Choose a country': 'Изберете држава',
    'Authors create an account to submit manuscripts. Reviewers join by invitation from the editorial office.':
        'Авторите отвораат сметка за да поднесуваат ракописи. Рецензентите се приклучуваат на покана од редакцијата.',
    Roles: 'Улоги',
    Role: 'Улога',
    'your own role': 'ваша улога',
    Cancel: 'Откажи',
    'Save roles': 'Зачувај улоги',
    'A deactivated account cannot sign in. Its manuscripts, reviews and history are kept.':
        'Деактивирана сметка не може да се најави. Нејзините ракописи, рецензии и историја се чуваат.',
    'This account is deactivated and cannot sign in.':
        'Оваа сметка е деактивирана и не може да се најави.',
    'Deactivate account': 'Деактивирај ја сметката',
    'Reactivate account': 'Повторно активирај ја сметката',
    'Authors sign up themselves and reviewers join by invitation. Here you add or remove roles and deactivate accounts.':
        'Авторите сами се регистрираат, а рецензентите доаѓаат на покана. Тука додавате или отстранувате улоги и деактивирате сметки.',
    'Name, e-mail, institution or ORCID': 'Име, е-пошта, институција или ORCID',
    'All roles': 'Сите улоги',
    Status: 'Статус',
    All: 'Сите',
    Active: 'Активни',
    Deactivated: 'Деактивирана',
    '{count} people': 'Вкупно: {count}',
    Person: 'Лице',
    Institution: 'Институција',
    Since: 'Од',
    Actions: 'Дејства',
    'No one matches these filters.': 'Никој не одговара на овие филтри.',
    'Two-factor authentication on': 'Вклучена двофакторска најава',
    'E-mail not confirmed': 'Е-поштата не е потврдена',
    Edit: 'Уреди',
    'New author?': 'Нов автор?',
    'Create an author account': 'Отворете авторска сметка',
    Name: 'Име',
    'Title (optional)': 'Звање (по избор)',
    None: 'Без',
    'Given name': 'Име',
    'Family name': 'Презиме',
    'Institution / affiliation': 'Институција / афилијација',
    'As it should appear under your name, e.g. Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.':
        'Како што треба да стои под вашето име, на пр. Фармацевтски факултет, Универзитет „Св. Кирил и Методиј“ во Скопје.',
    Country: 'Држава',
    'ORCID iD (optional)': 'ORCID iD (по избор)',
    'Printed with your name in published papers.':
        'Се печати со вашето име во објавените трудови.',
    'Sign-in': 'Најава',
    'We send a link to confirm it. Decisions and reviews arrive at this address.':
        'Ќе испратиме линк за потврда. Одлуките и рецензиите стигнуваат на оваа адреса.',
    'Repeat the password': 'Повторете ја лозинката',
    'I agree that the journal keeps my details to handle my manuscripts and reviews.':
        'Се согласувам списанието да ги чува моите податоци за обработка на моите ракописи и рецензии.',
    'Privacy statement': 'Изјава за приватност',
    'Create account': 'Отвори сметка',
    'Already have an account?': 'Веќе имате сметка?',
    'Welcome, {name}': 'Добредојдовте, {name}',
    'Your roles: {roles}': 'Ваши улоги: {roles}',
    'Your account has no role yet. The editorial office will assign one.':
        'Вашата сметка сè уште нема улога. Редакцијата ќе ви додели.',
    'The editorial office pages need two-factor authentication.':
        'За страниците на редакцијата потребна е двофакторска најава.',
    'Set it up now': 'Поставете ја сега',
    'People, roles and manuscripts sent through the website.':
        'Луѓе, улоги и ракописи испратени преку веб-страницата.',
    Reviewers: 'Рецензенти',
    Author: 'Автор',
    Reviewer: 'Рецензент',
    'Unconfirmed e-mail addresses': 'Непотврдени е-адреси',
    '{count} this week': '{count} оваа недела',
    'My manuscripts': 'Мои ракописи',
    'Write on the journal template, submit, and follow the review.':
        'Пишувајте на шаблонот на списанието, поднесете и следете ја рецензијата.',
    'Online writing and submission open soon. Until then, send your manuscript with the form on the website.':
        'Пишувањето и поднесувањето преку системот наскоро се отвораат. Дотогаш, испратете го ракописот преку формата на веб-страницата.',
    'My reviews': 'Мои рецензии',
    'Invitations from the editorial office and the manuscripts you review.':
        'Покани од редакцијата и ракописите што ги рецензирате.',
    'No review invitations at the moment. We will e-mail you when the editorial office invites you.':
        'Во моментов нема покани за рецензија. Ќе ви пишеме кога редакцијата ќе ве покани.',
    'Profile settings': 'Поставки на профилот',
    Profile: 'Профил',
    'Your name and institution as they appear on manuscripts and reviews.':
        'Вашето име и институција како што се прикажуваат на ракописите и рецензиите.',
    'Your e-mail address is not confirmed yet.':
        'Вашата е-адреса сè уште не е потврдена.',
    'Send the confirmation link again.':
        'Испратете го линкот за потврда повторно.',
    'A new confirmation link has been sent to your e-mail address.':
        'На вашата е-адреса е испратен нов линк за потврда.',
    'Department (optional)': 'Катедра / оддел (по избор)',
    'City (optional)': 'Град (по избор)',
    'Phone (optional)': 'Телефон (по избор)',
    'Only the editorial office sees it; needed for the corresponding author.':
        'Го гледа само редакцијата; потребен е за авторот за кореспонденција.',
    'Areas of expertise (optional)': 'Области на експертиза (по избор)',
    'Keywords, separated by commas. They help the editorial office choose reviewers.':
        'Клучни зборови, одделени со запирки. Ѝ помагаат на редакцијата да избере рецензенти.',
    'Language of e-mails': 'Јазик на е-пораките',
    Save: 'Зачувај',
    "Sign in to the Bulletin's manuscript system.":
        'Најавете се во системот за ракописи на Билтенот.',
    'With an account you write and submit manuscripts on the journal template and follow them through review.':
        'Со сметка пишувате и поднесувате ракописи на шаблонот на списанието и ги следите низ рецензијата.',

    // Back-office: author manuscript editor
    Submitted: 'Поднесен',
    'Under review': 'Во рецензија',
    'Revision requested': 'Побарана ревизија',
    Resubmitted: 'Повторно поднесен',
    'In production': 'Во продукција',
    Rejected: 'Одбиен',
    Withdrawn: 'Повлечен',
    'Untitled manuscript': 'Ракопис без наслов',
    English: 'англиски',
    Macedonian: 'македонски',
    'The work has not been published before and is not under consideration elsewhere.':
        'Трудот не е претходно објавен и не е во постапка за објавување на друго место.',
    'All authors have approved the manuscript and agree with its submission.':
        'Сите автори го одобриле ракописот и се согласни тој да биде поднесен.',
    'Permission has been obtained for any material reproduced from other sources.':
        'Добиена е дозвола за секој материјал преземен од други извори.',
    'The manuscript has been spell- and grammar-checked.':
        'Ракописот е проверен правописно и граматички.',
    'All references in the text are in the reference list and vice versa.':
        'Сите цитати во текстот се во листата на литература и обратно.',
    'Insert symbol': 'Вметни симбол',
    Symbol: 'Симбол',
    Greek: 'Грчки букви',
    'Operators and signs': 'Оператори и знаци',
    'Quotation marks': 'Наводници',
    alpha: 'алфа',
    beta: 'бета',
    gamma: 'гама',
    delta: 'делта',
    'capital delta': 'голема делта',
    epsilon: 'епсилон',
    theta: 'тета',
    kappa: 'капа',
    lambda: 'ламбда',
    'micro sign (units: µg, µL)': 'знак за микро (единици: µg, µL)',
    'Greek mu': 'грчко ми',
    pi: 'пи',
    rho: 'ро',
    sigma: 'сигма',
    'capital sigma': 'голема сигма',
    tau: 'тау',
    phi: 'фи',
    chi: 'хи',
    omega: 'омега',
    'capital omega': 'голема омега',
    'plus-minus': 'плус-минус',
    multiplication: 'множење',
    division: 'делење',
    'minus sign': 'знак минус',
    'en dash (ranges)': 'кратка црта (опсези)',
    'less than or equal': 'помало или еднакво',
    'greater than or equal': 'поголемо или еднакво',
    approximately: 'приближно',
    'not equal': 'не е еднакво',
    tilde: 'тилда',
    'right arrow': 'стрелка надесно',
    equilibrium: 'рамнотежа',
    'square root': 'квадратен корен',
    summation: 'сума',
    'middle dot': 'средна точка',
    'per mille': 'промил',
    degree: 'степен',
    prime: 'прим',
    'double prime': 'двоен прим',
    apostrophe: 'апостроф',
    'left double quote': 'лев двоен наводник',
    'right double quote': 'десен двоен наводник',
    'low double quote (Macedonian)': 'долен двоен наводник (македонски)',
    'Formatting toolbar (Alt+F10 from the text, Escape to return)':
        'Алатки за форматирање (Alt+F10 од текстот, Escape за враќање)',
    History: 'Историја',
    'Undo (Ctrl+Z)': 'Врати (Ctrl+Z)',
    'Redo (Ctrl+Shift+Z)': 'Повтори (Ctrl+Shift+Z)',
    Text: 'Текст',
    'Bold (Ctrl+B)': 'Задебелено (Ctrl+B)',
    'Italic (Ctrl+I)': 'Курзив (Ctrl+I)',
    'Subscript (Ctrl+,)': 'Долен индекс (Ctrl+,)',
    'Superscript (Ctrl+.)': 'Горен индекс (Ctrl+.)',
    Paragraph: 'Пасус',
    'Subheading (italic, level 2)': 'Поднаслов (курзив, ниво 2)',
    'Bulleted list': 'Листа со точки',
    'Numbered list': 'Нумерирана листа',
    'Insert table': 'Вметни табела',
    Rows: 'Редови',
    Cols: 'Колони',
    'Insert a {rows} × {cols} table': 'Вметни табела {rows} × {cols}',
    Insert: 'Вметни',
    'Add row above': 'Додај ред над',
    'Add row below': 'Додај ред под',
    'Delete row': 'Избриши ред',
    Row: 'Ред',
    'Header row (toggle for the selected rows)':
        'Заглавие (вклучи/исклучи за избраните редови)',
    Header: 'Заглавие',
    Columns: 'Колони',
    'Add column left': 'Додај колона лево',
    'Add column right': 'Додај колона десно',
    'Delete column': 'Избриши колона',
    Col: 'Колона',
    'Align column left': 'Порамни ја колоната лево',
    'Center column': 'Центрирај ја колоната',
    'Align column right': 'Порамни ја колоната десно',
    Cells: 'Ќелии',
    'Merge selected cells (select with Shift+arrows or drag)':
        'Спои ги избраните ќелии (изберете со Shift+стрелки или со влечење)',
    Merge: 'Спои',
    'Split merged cell': 'Раздели ја споената ќелија',
    Split: 'Раздели',
    'Table notes and table': 'Белешки под табелата и табела',
    'Add a note under the table': 'Додај белешка под табелата',
    Note: 'Белешка',
    'Note marker': 'Ознака на белешката',
    'Note marker (cursor in a note)':
        'Ознака на белешката (курсорот во белешка)',
    'no marker': 'без ознака',
    'Delete table (with caption and notes)':
        'Избриши ја табелата (со насловот и белешките)',
    Table: 'Табела',
    'Table caption (no final period)':
        'Наслов на табелата (без точка на крајот)',
    'Table note': 'Белешка под табелата',
    'Add author': 'Додај автор',
    'Add the authors in the order they are printed. Mark the corresponding author.':
        'Додајте ги авторите по редоследот по кој се печатат. Означете го авторот за кореспонденција.',
    'Author {n}': 'Автор {n}',
    'Author {n}: {name}': 'Автор {n}: {name}',
    'Move {name} up': 'Помести го/ја {name} нагоре',
    'Move up': 'Помести нагоре',
    'Move {name} down': 'Помести го/ја {name} надолу',
    'Move down': 'Помести надолу',
    'Remove {name}': 'Отстрани го/ја {name}',
    Remove: 'Отстрани',
    'Given name in the {summary}': 'Име во делот {summary}',
    'Family name in the {summary}': 'Презиме во делот {summary}',
    'E-mail (required)': 'Е-пошта (задолжително)',
    'This is not a valid e-mail address.': 'Ова не е валидна е-адреса.',
    'Required for the corresponding author.':
        'Задолжително за авторот за кореспонденција.',
    'Phone (required)': 'Телефон (задолжително)',
    'Required for the corresponding author, with the country code.':
        'Задолжително за авторот за кореспонденција, со позивниот број на земјата.',
    'Only the editorial office sees it.': 'Го гледа само редакцијата.',
    'Use the form 0000-0000-0000-0000.':
        'Користете го обликот 0000-0000-0000-0000.',
    'Corresponding author (marked *)':
        'Автор за кореспонденција (означен со *)',
    'Affiliations of this author': 'Афилијации на овој автор',
    'Add an affiliation below first.': 'Прво додајте афилијација подолу.',
    'Affiliation {n} (not filled in yet)':
        'Афилијација {n} (сè уште не е пополнета)',
    'Choose at least one affiliation.': 'Изберете барем една афилијација.',
    'Add affiliation': 'Додај афилијација',
    'Full postal address: department, institution, street, postal code, city, country.':
        'Целосна поштенска адреса: катедра, институција, улица, поштенски број, град, држава.',
    'Affiliation {n}': 'Афилијација {n}',
    'The same in the {summary}': 'Истото во делот {summary}',
    'Move affiliation {n} up': 'Помести ја афилијацијата {n} нагоре',
    'Move affiliation {n} down': 'Помести ја афилијацијата {n} надолу',
    'Remove affiliation {n}': 'Отстрани ја афилијацијата {n}',
    'Error:': 'Грешка:',
    'Warning:': 'Предупредување:',
    'Key words in order of importance': 'Клучни зборови по важност',
    'Move key word "{word}" earlier':
        'Помести го клучниот збор „{word}“ понапред',
    'Move earlier': 'Помести понапред',
    'Remove key word "{word}"': 'Отстрани го клучниот збор „{word}“',
    'Maximum reached': 'Достигнат е максимумот',
    'Type a key word, then Enter': 'Внесете клучен збор, па Enter',
    '{min}–{max} key words, the most important first ({count} so far).':
        '{min}–{max} клучни зборови, најважниот прв (досега {count}).',
    Preview: 'Преглед',
    'The last saved version, as the journal will print it (one column).':
        'Последната зачувана верзија, како што ќе ја отпечати списанието (во една колона).',
    'Saving and preparing the preview…':
        'Зачувување и подготовка на прегледот…',
    'The preview could not be loaded. Check your connection and try again.':
        'Прегледот не можеше да се вчита. Проверете ја врската и обидете се повторно.',
    'Section {n}': 'Дел {n}',
    'Section heading': 'Наслов на делот',
    'Move section "{name}" up': 'Помести го делот „{name}“ нагоре',
    'Move section "{name}" down': 'Помести го делот „{name}“ надолу',
    'Remove section "{name}"': 'Отстрани го делот „{name}“',
    'A review needs at least one section of its own.':
        'Прегледниот труд има потреба од барем еден свој дел.',
    'Choose the heading': 'Изберете наслов',
    'This section is not part of the template of this article type. Move its text to another section, then remove it.':
        'Овој дел не е во шаблонот за овој тип труд. Преместете го текстот во друг дел, па отстранете го.',
    '{section}: text': '{section}: текст',
    'Write the {section} here, or paste it from Word.':
        'Тука напишете го делот „{section}“ или залепете го од Word.',
    'Add a section': 'Додај дел',
    'A review has sections of its own between the Introduction and the Conclusion.':
        'Прегледниот труд има свои делови меѓу Воведот и Заклучокот.',
    'Remove this section?': 'Да се отстрани овој дел?',
    'The section "{name}" and all its text will be removed.':
        'Делот „{name}“ и целиот негов текст ќе бидат отстранети.',
    'Untitled section': 'Дел без наслов',
    'Remove section': 'Отстрани го делот',
    'Saved {time}': 'Зачувано во {time}',
    'All changes saved': 'Сите промени се зачувани',
    'Unsaved changes': 'Незачувани промени',
    'Saving…': 'Се зачувува…',
    'Not saved — retrying': 'Не е зачувано — нов обид',
    'Not saved — session expired': 'Не е зачувано — сесијата истече',
    'Not saved': 'Не е зачувано',
    'Changed in another window': 'Променето во друг прозорец',
    Checks: 'Проверки',
    'No problems found. The manuscript is ready to submit.':
        'Нема пронајдени проблеми. Ракописот е подготвен за поднесување.',
    '{errors} to fix, {warnings} to consider.':
        '{errors} за поправање, {warnings} за разгледување.',
    '1 error': '1 грешка',
    '{count} errors': '{count} грешки',
    '1 warning': '1 предупредување',
    '{count} warnings': '{count} предупредувања',
    'Submit the revised manuscript': 'Поднесете го ревидираниот ракопис',
    'Submit the manuscript': 'Поднесете го ракописот',
    'Only the editorial office sees this page; it is not sent to the reviewers. After you submit, the manuscript can no longer be changed unless the editors ask for a revision.':
        'Оваа страница ја гледа само редакцијата; не се испраќа до рецензентите. По поднесувањето, ракописот повеќе не може да се менува, освен ако уредниците побараат ревизија.',
    'Suggest {count} experts in the field who are not from your institution and have not worked with you recently. The editors decide whether to invite them.':
        'Предложете {count} стручњаци од областа кои не се од вашата институција и неодамна не работеле со вас. Уредниците одлучуваат дали ќе ги поканат.',
    'Reviewer {n}': 'Рецензент {n}',
    'Institution and address': 'Институција и адреса',
    'Give the name, institution and e-mail address of every suggested reviewer.':
        'Наведете име, институција и е-адреса за секој предложен рецензент.',
    'Cover letter (optional)': 'Придружно писмо (по избор)',
    'Submission declaration': 'Изјава при поднесување',
    'Confirm every statement to submit.':
        'Потврдете ја секоја изјава за да поднесете.',
    'The manuscript was not sent:': 'Ракописот не е испратен:',
    'Back to the manuscript': 'Назад кон ракописот',
    'Send to the editorial office': 'Испрати до редакцијата',
    '{words} words — {over} over the limit of {limit}.':
        '{words} зборови — {over} над ограничувањето од {limit}.',
    '{words} of {limit} words': '{words} од {limit} зборови',
    'Formatting: {field}': 'Форматирање: {field}',
    'Click in the text to format it':
        'Кликнете во текстот за да го форматирате',
    'The manuscript could not be saved. Check the message at the top of the page and try again.':
        'Ракописот не можеше да се зачува. Погледнете ја пораката на врвот на страницата и обидете се повторно.',
    'Submit the revision…': 'Поднесете ја ревизијата…',
    'Submit…': 'Поднесете…',
    'Fix the errors listed below to submit ({count} left).':
        'Поправете ги грешките подолу за да поднесете (преостануваат {count}).',
    'Next you suggest reviewers and confirm the declaration.':
        'Потоа предлагате рецензенти и ја потврдувате изјавата.',
    'History and read-only view': 'Историја и приказ само за читање',
    'Delete draft': 'Избриши го нацртот',
    'Manuscript status and checks': 'Статус и проверки на ракописот',
    'Checks ({count})': 'Проверки ({count})',
    'Revise the manuscript': 'Ревидирајте го ракописот',
    'Write the manuscript': 'Пишување на ракописот',
    Reload: 'Вчитај повторно',
    'Changed in another window — reload. Autosave has stopped here; your latest text is kept in this browser and offered after the reload.':
        'Променето во друг прозорец — вчитајте повторно. Автоматското зачувување тука запре; вашиот последен текст се чува во овој прелистувач и ќе ви биде понуден по повторното вчитување.',
    'Sign in (new tab)': 'Најава (нова картичка)',
    'Your session expired — sign in again in a new tab; your changes are kept here and saved as soon as you are back.':
        'Вашата сесија истече — најавете се повторно во нова картичка; промените се чуваат тука и ќе се зачуваат штом ќе се вратите.',
    'Not saved — retrying in {seconds} s. Your changes are kept in this browser.':
        'Не е зачувано — нов обид за {seconds} с. Промените се чуваат во овој прелистувач.',
    'The server refused to save the manuscript. Your changes are kept in this browser.':
        'Серверот одби да го зачува ракописот. Промените се чуваат во овој прелистувач.',
    'This browser cannot keep a backup copy (private mode or full storage). Keep this tab open until the changes are saved.':
        'Овој прелистувач не може да чува резервна копија (приватен режим или полна меморија). Држете ја картичката отворена додека промените не се зачуваат.',
    Restore: 'Врати ги',
    'Keep the saved version': 'Задржи ја зачуваната верзија',
    'This browser has changes from {time} that did not reach the server. Restore them?':
        'Овој прелистувач има промени од {time} што не стигнаа до серверот. Да се вратат?',
    'Written in {language}': 'Напишан на {language}',
    'Title of the manuscript': 'Наслов на ракописот',
    'Running title (optional, printed at the top of odd pages)':
        'Краток наслов (по избор, се печати горе на непарните страници)',
    '{count} of {max} characters': '{count} од {max} знаци',
    'The abstract: aim, methods, main results and conclusion, without references.':
        'Апстрактот: цел, методи, главни резултати и заклучок, без цитати.',
    'Key words': 'Клучни зборови',
    Acknowledgements: 'Благодарност',
    'People and institutions you thank (not the funding, which goes below).':
        'Лица и институции на кои им се заблагодарувате (не финансирањето, тоа е подолу).',
    'Funders and grant numbers, or: This research received no specific funding.':
        'Финансиери и броеви на проекти, или: Ова истражување не доби посебно финансирање.',
    'One reference per paragraph, in alphabetical order of the first author, then by year. All authors, no italics:':
        'Една референца во пасус, по азбучен ред на првиот автор, па по година. Сите автори, без курзив:',
    'Paste or type the reference list, one reference per paragraph.':
        'Залепете ја или напишете ја листата на литература, една референца во пасус.',
    'The summary in {language}: title, key words and abstract. Names and addresses come from the authors above.':
        'Резимето на {language}: наслов, клучни зборови и апстракт. Имињата и адресите се земаат од авторите погоре.',
    'Title in {language}': 'Наслов на {language}',
    'Abstract in {language}': 'Апстракт на {language}',
    'Delete this draft?': 'Да се избрише нацртот?',
    'The draft and everything written in it will be deleted. This cannot be undone.':
        'Нацртот и сè што е напишано во него ќе бидат избришани. Ова не може да се врати.',
    'Loading the editor…': 'Се вчитува уредувачот…',
    'New manuscript': 'Нов ракопис',
    'Choose the type of paper. The editor opens with the sections of that type, in the journal’s layout.':
        'Изберете го типот на трудот. Уредувачот се отвора со деловите на тој тип, во изгледот на списанието.',
    'Language of the manuscript': 'Јазик на ракописот',
    'Start writing': 'Започнете со пишување',
    'No manuscripts yet': 'Сè уште нема ракописи',
    'Start a manuscript above. You write it here, section by section, on the journal’s template; tables are set in the journal’s style.':
        'Започнете ракопис погоре. Го пишувате тука, дел по дел, на шаблонот на списанието; табелите се во стилот на списанието.',
    'Every change is saved automatically. You can stop and continue later.':
        'Секоја промена се зачувува автоматски. Може да прекинете и да продолжите подоцна.',
    'The checks list what is still missing. When they are done, submit: the editorial office receives the manuscript and you follow the review here.':
        'Проверките покажуваат што уште недостасува. Кога ќе се исполнат, поднесете: редакцијата го добива ракописот, а вие ја следите рецензијата тука.',
    'Submitted {date}': 'Поднесен на {date}',
    'Last saved {date}': 'Последно зачуван на {date}',
    'Nothing has happened yet.': 'Сè уште нема настани.',
    to: 'во',
    'Reference {reference}': 'Број {reference}',
    'The manuscript': 'Ракописот',
    // Back-office: manuscripts (lead).
    Manuscripts: 'Ракописи',
    'Create an author account (or sign in).':
        'Отворете авторска сметка (или најавете се).',
    'Write the manuscript on the journal template: title page, sections, tables and references. It is saved as you type.':
        'Напишете го ракописот на шаблонот на списанието: насловна страна, делови, табели и литература. Се зачувува додека пишувате.',
    'Check the preview and send it. You get a reference number by e-mail.':
        'Проверете го прегледот и испратете го. Ќе добиете референтен број по е-пошта.',
    'Follow the review and the decision in your account.':
        'Следете ја рецензијата и одлуката во вашата сметка.',
    'Submit through the manuscript system':
        'Поднесување преку системот за ракописи',
    'Go to my manuscripts': 'Кон моите ракописи',
    'Open the manuscript system': 'Отворете го системот за ракописи',
    'Before you start, read the': 'Пред да почнете, прочитајте ги',
    'Every manuscript sent through the system. Drafts stay private to their authors.':
        'Сите ракописи испратени преку системот. Нацртите остануваат приватни за авторите.',
    'Filter by status': 'Филтер по статус',
    'Reference, title, author or e-mail':
        'Референца, наслов, автор или е-пошта',
    Reference: 'Референца',
    'Submitted by': 'Поднесен од',
    'No manuscripts match these filters.':
        'Ниту еден ракопис не одговара на овие филтри.',
    'Cover letter': 'Придружно писмо',
    Confirmed: 'Потврдено',
    'Not confirmed': 'Непотврдено',
    'New manuscripts to check': 'Нови ракописи за проверка',
    'Manuscripts in progress': 'Ракописи во постапка',
    Drafts: 'Нацрти',
    'Sent to the journal': 'Испратени до списанието',
    'Write a new manuscript': 'Напишете нов ракопис',
    'Accepted for publication': 'Прифатен за објавување',
    'Published in the journal': 'Објавен во списанието',
    // Feed page.
    'Latest articles feed': 'Фид со најнови трудови',
    'This address is a feed: a feed reader checks it for you and shows each new article as soon as it is published.':
        'Оваа адреса е фид: програмата за фидови ја проверува наместо вас и ви го покажува секој нов труд веднаш штом ќе биде објавен.',
    'How to subscribe': 'Како да се претплатите',
    'Copy the feed address below.': 'Копирајте ја адресата на фидот подолу.',
    'Paste it into your feed reader as a new subscription, for example {readers}.':
        'Залепете ја во вашата програма за фидови како нова претплата, на пример {readers}.',
    'Feed address': 'Адреса на фидот',
    Copy: 'Копирај',
    'Feed address copied.': 'Адресата на фидот е копирана.',
    'Prefer the website?': 'Повеќе сакате веб-страница?',
    'Early online articles': 'Трудови објавени онлајн однапред',
    'Latest issue and articles': 'Најнов број и трудови',
    'Now in the feed': 'Сега во фидот',
    'No articles at the moment.': 'Во моментов нема трудови.',
    // Author editor: figures
    'No image yet.': 'Сè уште нема слика.',
    'Choose an image': 'Изберете слика',
    'Uploading the image… {percent} %': 'Се прикачува сликата… {percent} %',
    'Uploading the image…': 'Се прикачува сликата…',
    'The image was not uploaded: {reason}': 'Сликата не е прикачена: {reason}',
    'Choose another file': 'Изберете друга датотека',
    Dismiss: 'Затвори',
    'Figure width': 'Ширина на сликата',
    Width: 'Ширина',
    '{percent} % of the text width': '{percent} % од ширината на текстот',
    'Replace image': 'Замени ја сликата',
    'Delete figure': 'Избриши ја сликата',
    'Describe image': 'Опис на сликата',
    'Short description for readers who cannot see the image':
        'Краток опис за читателите што не можат да ја видат сликата',
    Figures: 'Слики',
    'Insert figure (image)': 'Вметни слика',
    Figure: 'Слика',
    'Figure width (cursor in a figure caption)':
        'Ширина на сликата (курсорот во насловот на сликата)',
    'Alt text': 'Алт. текст',
    'the connection failed. Check it and try again.':
        'врската не успеа. Проверете ја и обидете се повторно.',
    'the file is not a usable image.': 'датотеката не е употреблива слика.',
    'the file is too large (at most 15 MB).':
        'датотеката е преголема (најмногу 15 MB).',
    'your session expired. Sign in again in a new tab, then try again.':
        'сесијата истече. Најавете се повторно во нова картичка, па обидете се пак.',
    'this manuscript can no longer be changed.':
        'овој ракопис повеќе не може да се менува.',
    'the server could not store it. Try again.':
        'серверот не можеше да ја зачува. Обидете се повторно.',
    'use a PNG, JPEG, WebP or GIF image.':
        'користете слика PNG, JPEG, WebP или GIF.',
    'Figure caption (no final period)':
        'Наслов на сликата (без точка на крајот)',
    'Download Word (.docx)': 'Преземи во Word (.docx)',
    // Publication details.
    'Publication details': 'Податоци за објавување',
    'First page': 'Прва страница',
    'Last page': 'Последна страница',
    'Article no.': 'Бр. на труд',
    'Suggest DOI': 'Предложи DOI',
    'Fill in volume, issue, year and the article number first.':
        'Прво внесете том, број, година и број на трудот.',
    'Journal pattern: {pattern}': 'Шема на списанието: {pattern}',
    'Save publication details': 'Зачувај ги податоците за објавување',
    'Publication details updated': 'Ажурирани податоци за објавување',
    // Peer review: reviewer, editor and author pages, dashboard
    'Sent to reviewers': 'Испратен на рецензенти',
    'Reviewer invited': 'Поканет рецензент',
    'Reviewer accepted': 'Рецензентот прифати',
    'Reviewer declined': 'Рецензентот одби',
    'Invitation withdrawn': 'Поканата е повлечена',
    'Accept as it is': 'Прифати',
    'Minor revision': 'Мала ревизија',
    'Major revision': 'Голема ревизија',
    Reject: 'Одбиј',
    'Minor revision requested': 'Побарана мала ревизија',
    'Major revision requested': 'Побарана голема ревизија',
    'Rejected after review': 'Одбиен по рецензијата',
    Reviewing: 'Рецензира',
    'No answer (expired)': 'Без одговор (истечено)',
    'The manuscript can be published as it is.':
        'Ракописот може да се објави каков што е.',
    'Small corrections; no new review needed.':
        'Мали корекции; не е потребна нова рецензија.',
    'Substantial changes; another review is needed.':
        'Суштински измени; потребна е нова рецензија.',
    'The manuscript is not suitable for the journal.':
        'Ракописот не е соодветен за списанието.',
    'No manuscripts yet.': 'Сè уште нема ракописи.',
    Decided: 'Одлучено',
    '{month}: {received} received, {decided} decided':
        '{month}: примени {received}, одлучени {decided}',
    'Last 12 months: {received} manuscripts received and {decided} decisions made. The table below has the numbers per month.':
        'Последните 12 месеци: примени {received} ракописи и донесени {decided} одлуки. Табелата подолу ги има бројките по месеци.',
    'Show as a table': 'Прикажи како табела',
    Month: 'Месец',
    'Review overdue': 'Рецензијата доцни',
    'Invitation not answered in time': 'Поканата не е одговорена навреме',
    'Reviews are in: ready for a decision':
        'Рецензиите пристигнаа: подготвено за одлука',
    'Revision received': 'Примена ревизија',
    'New submission to check': 'Нов ракопис за проверка',
    'Needs reviewers': 'Потребни се рецензенти',
    '{count} days': '{count} дена',
    'Manuscripts received': 'Примени ракописи',
    'This year': 'Оваа година',
    'Acceptance rate': 'Стапка на прифаќање',
    '{accepted} accepted · {rejected} rejected':
        '{accepted} прифатени · {rejected} одбиени',
    'To the first decision': 'До првата одлука',
    'on average, from receipt': 'просечно, од приемот',
    'Needs your attention': 'Бара ваше внимание',
    'Nothing is waiting for the editorial office.':
        'Ништо не чека на редакцијата.',
    Overdue: 'Доцни',
    'due {date}': 'рок {date}',
    'since {date}': 'од {date}',
    'Received and decided, last 12 months':
        'Примени и одлучени, последните 12 месеци',
    'Manuscripts by status': 'Ракописи по статус',
    'Manuscripts by type': 'Ракописи по тип',
    Reviews: 'Рецензии',
    'All reviewers': 'Сите рецензенти',
    'Invitations awaiting an answer': 'Покани што чекаат одговор',
    'Reviews in progress': 'Рецензии во тек',
    'Reviews received': 'Примени рецензии',
    'Invitations declined': 'Одбиени покани',
    'Average time to review': 'Просечно време за рецензија',
    'Response to the reviewers': 'Одговор до рецензентите',
    'Answer every comment point by point and say what you changed and where. Under anonymous review, do not sign it or name the authors.':
        'Одговорете на секој коментар точка по точка и наведете што и каде сте промениле. Кај анонимна рецензија не потпишувајте се и не ги наведувајте авторите.',
    'Write your response to the reviewers to submit the revision.':
        'Напишете го одговорот до рецензентите за да ја поднесете ревизијата.',
    'Suggested by the authors': 'Предложени од авторите',
    invited: 'поканет',
    'Find a reviewer in the journal’s list':
        'Најдете рецензент во списокот на списанието',
    'Name, e-mail, institution or expertise':
        'Име, е-пошта, институција или експертиза',
    'No one in the list matches. Type the e-mail address below.':
        'Никој од списокот не одговара. Внесете ја е-адресата подолу.',
    'Days to answer the invitation': 'Денови за одговор на поканата',
    'Days to send the review': 'Денови за испраќање на рецензијата',
    'Personal message (optional)': 'Лична порака (по избор)',
    'Added to the invitation e-mail, above the title and abstract.':
        'Се додава во е-поканата, над насловот и апстрактот.',
    'Send the invitation': 'Испрати ја поканата',
    Invited: 'Поканет',
    'Answer by': 'Одговор до',
    Answered: 'Одговорено',
    'Review received': 'Рецензијата е примена',
    'Review due': 'Рок за рецензијата',
    'None declared': 'Нема пријавено',
    'Hide review': 'Сокриј ја рецензијата',
    'Read review': 'Прочитај ја рецензијата',
    Remind: 'Потсети',
    Withdraw: 'Повлечи',
    '{count} reviewer(s) of this round have not sent a review yet.':
        '{count} рецензент(и) од овој круг сè уште не испратиле рецензија.',
    Decision: 'Одлука',
    'Letter to the authors': 'Писмо до авторите',
    'Start again from the template': 'Започни одново од шаблонот',
    'Prepared from the template with the reviewers’ comments to the authors (never the confidential comments). Written in the language of the manuscript ({language}); edit it as needed.':
        'Подготвено од шаблонот со коментарите на рецензентите до авторите (никогаш доверливите коментари). Напишано на јазикот на ракописот ({language}); изменете го по потреба.',
    'Send the decision…': 'Испрати ја одлуката…',
    'Send this decision?': 'Да се испрати оваа одлука?',
    '"{decision}" and the letter are e-mailed to the authors and shown on their manuscript page. This cannot be undone.':
        '„{decision}“ и писмото се испраќаат по е-пошта до авторите и се прикажуваат на страницата на ракописот. Ова не може да се врати.',
    'Send the decision': 'Испрати ја одлуката',
    'Round {n}': 'Круг {n}',
    '{received} of {active} reviews received':
        'Примени {received} од {active} рецензии',
    'Double-anonymous: reviewers do not see the authors.':
        'Двојно анонимна: рецензентите не ги гледаат авторите.',
    'Single-anonymous: reviewers see the authors.':
        'Еднострано анонимна: рецензентите ги гледаат авторите.',
    'Invite a reviewer': 'Покани рецензент',
    'Reviewers can be invited once the manuscript is submitted.':
        'Рецензенти може да се поканат откако ракописот ќе биде поднесен.',
    'No reviewers invited in this round yet.':
        'Во овој круг сè уште нема поканети рецензенти.',
    'Name and e-mail': 'Име и е-пошта',
    Dates: 'Датуми',
    'Competing interests': 'Конфликт на интереси',
    'Decisions sent': 'Испратени одлуки',
    'Withdraw this invitation?': 'Да се повлече поканата?',
    '{name} ({email}) is told by e-mail that the review is no longer needed.':
        '{name} ({email}) ќе добие е-порака дека рецензијата повеќе не е потребна.',
    'The reviewer': 'Рецензентот',
    'Withdraw the invitation': 'Повлечи ја поканата',
    'Shared with the authors': 'Споделено со авторите',
    'Editorial office only': 'Само за редакцијата',
    'Delete {name}': 'Избриши {name}',
    'Allowed file types: {types}.': 'Дозволени типови датотеки: {types}.',
    'The file is larger than {mb} MB.': 'Датотеката е поголема од {mb} MB.',
    'Choose a recommendation.': 'Изберете препорака.',
    'Write your comments to the authors.':
        'Напишете ги коментарите до авторите.',
    'Your review': 'Вашата рецензија',
    'Draft saved {time}': 'Нацртот е зачуван {time}',
    Recommendation: 'Препорака',
    'Your recommendation is advice; the editor makes the decision.':
        'Вашата препорака е совет; одлуката ја носи уредникот.',
    'Comments to the authors': 'Коментари до авторите',
    'Sent to the authors with the decision, under "Reviewer" and a number. Do not sign them.':
        'Се испраќаат до авторите со одлуката, под „Рецензент“ и број. Не потпишувајте ги.',
    'Confidential comments to the editor (optional)':
        'Доверливи коментари до уредникот (по избор)',
    'Never shown to the authors.': 'Никогаш не се прикажуваат на авторите.',
    'Files (optional)': 'Датотеки (по избор)',
    'Share with the authors': 'Сподели со авторите',
    'Uploading… {percent} %': 'Се прикачува… {percent} %',
    'Attach a file': 'Прикачи датотека',
    'Up to {mb} MB: {types}.': 'До {mb} MB: {types}.',
    'File properties (the author field of a Word or PDF file) can reveal your name; remove it before you share a file with the authors.':
        'Својствата на датотеката (полето автор во Word или PDF) може да го откријат вашето име; отстранете го пред да ја споделите со авторите.',
    'Save draft': 'Зачувај нацрт',
    'Submit review…': 'Испрати ја рецензијата…',
    'Submit your review?': 'Да се испрати рецензијата?',
    'After you submit, the review can no longer be changed. The editorial office is notified.':
        'По испраќањето рецензијата повеќе не може да се менува. Редакцијата добива известување.',
    '{count} words': '{count} зборови',
    'Confidential comments': 'Доверливи коментари',
    Yes: 'Да',
    Files: 'Датотеки',
    'Back to the review': 'Назад кон рецензијата',
    'Submit review': 'Испрати ја рецензијата',
    'Confidential comments to the editor': 'Доверливи коментари до уредникот',
    'Overdue by 1 day': 'Доцни 1 ден',
    'Overdue by {count} days': 'Доцни {count} дена',
    'Due today': 'Рокот е денес',
    'Due tomorrow': 'Рокот е утре',
    'Due in {count} days': 'Рок за {count} дена',
    'The connection failed. Check it and try again.':
        'Врската не успеа. Проверете ја и обидете се повторно.',
    'Your session expired. Sign in again in a new tab, then try again.':
        'Сесијата истече. Најавете се повторно во нова картичка, па обидете се пак.',
    'This can no longer be changed.': 'Ова повеќе не може да се менува.',
    'The file is too large.': 'Датотеката е преголема.',
    'Something went wrong. Try again.':
        'Нешто тргна наопаку. Обидете се повторно.',
    'version {n}': 'верзија {n}',
    'No invitations yet.': 'Сè уште нема покани.',
    'Sent {date}': 'Испратено {date}',
    'OVERDUE since {date}': 'ДОЦНИ од {date}',
    'Everyone invited to review, with their invitations: who is reviewing what, what is overdue and how quickly they answer.':
        'Сите поканети да рецензираат, со нивните покани: кој што рецензира, што доцни и колку брзо одговараат.',
    Show: 'Прикажи',
    'With an open invitation or review': 'Со отворена покана или рецензија',
    'With something overdue ({count})': 'Со нешто што доцни ({count})',
    '{count} reviewers': '{count} рецензенти',
    'Institution and expertise': 'Институција и експертиза',
    Declined: 'Одбиени',
    Sent: 'Испратени',
    Expired: 'Истечени',
    'Average days': 'Просечно денови',
    'Last activity': 'Последна активност',
    Invitations: 'Покани',
    'No reviewers have been invited yet.': 'Сè уште нема поканети рецензенти.',
    'No account yet': 'Сè уште нема сметка',
    'Invitations ({count})': 'Покани ({count})',
    'Create your reviewer account': 'Создајте рецензентска сметка',
    'The account is for {email}. With it you answer the invitation, read the manuscript and send your review.':
        'Сметката е за {email}. Со неа одговарате на поканата, го читате ракописот и ја испраќате рецензијата.',
    'Create account and continue': 'Создај сметка и продолжи',
    'Invitation to review': 'Покана за рецензија',
    'The editorial office invites you to review a manuscript for the journal.':
        'Редакцијата ве поканува да рецензирате ракопис за списанието.',
    'Message from the editorial office': 'Порака од редакцијата',
    'Read the abstract': 'Прочитајте го апстрактот',
    'You already have an account with {email}. Sign in to answer the invitation.':
        'Веќе имате сметка со {email}. Најавете се за да одговорите на поканата.',
    'You are signed in as {current}, but the invitation was sent to {email}. Sign out, then open the link in the e-mail again.':
        'Најавени сте како {current}, а поканата е испратена на {email}. Одјавете се, па повторно отворете ја врската од е-поштата.',
    'Sign out': 'Одјави се',
    'This invitation is no longer open: it was answered, withdrawn or has expired. If you think this is a mistake, write to the editorial office.':
        'Оваа покана повеќе не е отворена: одговорена е, повлечена или истечена. Ако мислите дека е грешка, пишете ѝ на редакцијата.',
    'Decisions and reviews': 'Одлуки и рецензии',
    'Letter from the editorial office': 'Писмо од редакцијата',
    'The editors ask you to revise the manuscript.':
        'Уредниците бараат да го ревидирате ракописот.',
    'Read the decision and the reviews below, revise the text and answer each comment in your response to the reviewers.':
        'Прочитајте ги одлуката и рецензиите подолу, ревидирајте го текстот и одговорете на секој коментар во одговорот до рецензентите.',
    'Revision due': 'Рок за ревизијата',
    'Invitations to answer': 'Покани за одговор',
    'Reviews sent': 'Испратени рецензии',
    'Open my reviews': 'Отвори ги моите рецензии',
    Respond: 'Одговори',
    'Write the review': 'Напиши рецензија',
    'No reviews yet': 'Сè уште нема рецензии',
    'Read the abstract, then accept or decline. The editorial office waits for your answer.':
        'Прочитајте го апстрактот, па прифатете или одбијте. Редакцијата го чека вашиот одговор.',
    'Declined, withdrawn or expired': 'Одбиени, повлечени или истечени',
    'Choose one of the two statements.': 'Изберете една од двете изјави.',
    'Describe the competing interests.': 'Опишете го конфликтот на интереси.',
    'I have no competing interests.': 'Немам конфликт на интереси.',
    'I have competing interests (describe them below).':
        'Имам конфликт на интереси (опишете го подолу).',
    'By accepting you agree to keep the manuscript confidential and not to use it for your own work.':
        'Со прифаќањето се согласувате ракописот да го чувате доверлив и да не го користите за сопствена работа.',
    'Accept and start the review': 'Прифати и започни ја рецензијата',
    Decline: 'Одбиј',
    'Reason (optional)': 'Причина (по избор)',
    'e.g. outside my field, no time now; you may suggest a colleague.':
        'на пр. надвор од мојата област, немам време сега; може да предложите колега.',
    'Decline the invitation': 'Одбиј ја поканата',
    'You are Reviewer {n}': 'Вие сте Рецензент {n}',
    'Title page and abstract': 'Насловна страница и апстракт',
    'Will you review this manuscript?': 'Дали ќе го рецензирате овој ракопис?',
    'You see the title page and the abstract. The full text opens when you accept.':
        'Ги гледате насловната страница и апстрактот. Целиот текст се отвора кога ќе прифатите.',
    'The authors’ response to the reviewers':
        'Одговорот на авторите до рецензентите',
    'Thank you. Your review was sent on {date}; the editorial office will make the decision.':
        'Ви благодариме. Рецензијата е испратена на {date}; редакцијата ќе ја донесе одлуката.',
    'You declined this invitation. Thank you for letting us know.':
        'Ја одбивте оваа покана. Ви благодариме што нè известивте.',
    'The editorial office withdrew this invitation. You do not need to do anything.':
        'Редакцијата ја повлече оваа покана. Не треба ништо да правите.',
    'The invitation expired without an answer. If you would still like to review, write to the editorial office.':
        'Поканата истече без одговор. Ако сè уште сакате да рецензирате, пишете ѝ на редакцијата.',
    'Back to my reviews': 'Назад кон моите рецензии',
    'Make a decision…': 'Донесете одлука…',
    'All reviews of this round are in.':
        'Сите рецензии од овој круг пристигнаа.',
    'You can decide now or wait for the reviews; the letter is prepared with the reviews received.':
        'Може да одлучите сега или да ги почекате рецензиите; писмото се подготвува со примените рецензии.',
    'Old website form': 'Стара веб-форма',
    'What is this page?': 'Што е оваа страница?',
    'Before the manuscript system, authors sent a file through a simple form on the website, without an account. Those manuscripts are kept here, with their files, for the record. The form is now closed: new manuscripts are written and sent in the system, under Manuscripts.':
        'Пред системот за ракописи, авторите праќаа фајл преку едноставна форма на веб-страницата, без сметка. Тие ракописи се чуваат тука, со нивните фајлови, за евиденција. Формата сега е затворена: новите ракописи се пишуваат и праќаат во системот, под Ракописи.',
    'Go to Manuscripts': 'Кон Ракописи',
    '1 reviewer': '1 рецензент',
    'Returned for corrections': 'Вратен за поправки',
    'Accept for publication': 'Прифати за објавување',
    'Request a minor revision': 'Побарај мала ревизија',
    'Request a major revision': 'Побарај голема ревизија',
    'Return to the authors for corrections': 'Врати им на авторите за поправки',
    'Notes (editorial office only)': 'Белешки (само за редакцијата)',
    'Never shown to the authors or the reviewers.':
        'Никогаш не се прикажуваат на авторите и рецензентите.',
    'New note': 'Нова белешка',
    'Write a note for the editorial office…':
        'Напишете белешка за редакцијата…',
    'Add note': 'Додај белешка',
    'Actions on this manuscript': 'Дејства за овој ракопис',
    'Invite reviewers': 'Покани рецензенти',
    'Decision…': 'Одлука…',
    'Only before the review starts (submitted or resubmitted).':
        'Само пред да почне рецензијата (поднесен или повторно поднесен).',
    'No review actions in this status; notes and publication details stay available.':
        'Во овој статус нема дејства за рецензија; белешките и податоците за објавување остануваат достапни.',
    'Actions for {reference}': 'Дејства за {reference}',
    Open: 'Отвори',
    'The editorial office returned the manuscript for corrections.':
        'Редакцијата го врати ракописот за поправки.',
    'Read the letter below, correct the manuscript and submit it again.':
        'Прочитајте го писмото подолу, поправете го ракописот и поднесете го повторно.',
    'No manuscripts in this period yet.':
        'Во овој период сè уште нема ракописи.',
    'Messages from the editorial office': 'Пораки од редакцијата',
    Notes: 'Белешки',
    'Internal unless you send a note to the authors; reviewers never see notes.':
        'Интерни, освен ако белешката не ја испратите до авторите; рецензентите никогаш не ги гледаат белешките.',
    'Who sees this note': 'Кој ја гледа белешката',
    'Only the editorial office': 'Само редакцијата',
    'Send to the authors (by e-mail)': 'Испрати до авторите (по е-пошта)',
    'Send to the authors': 'Испрати до авторите',
    'Sent to the authors': 'Испратено до авторите',
    Internal: 'Интерно',
    'Choose a decision…': 'Изберете одлука…',
    // Archive (published articles, metadata only)
    'No DOI': 'Нема DOI',
    registered: 'регистриран',
    'not registered': 'нерегистриран',
    'not checked': 'непроверен',
    Untitled: 'Без наслов',
    'no abstract': 'нема апстракт',
    'no key words': 'нема клучни зборови',
    'no PDF': 'нема PDF',
    'corrected by the editorial office': 'поправено од редакцијата',
    'Edit data': 'Уреди податоци',
    'Open PDF': 'Отвори PDF',
    'Public page': 'Јавна страница',
    'Move {item} up': 'Помести „{item}“ нагоре',
    'Move {item} down': 'Помести „{item}“ надолу',
    'Remove {item}': 'Отстрани „{item}“',
    'corrected by hand': 'рачно поправено',
    'Correct the published data': 'Поправка на објавените податоци',
    'Only the data shown on the website and sent to indexing services changes; the PDF stays as published. Fields you correct are marked "corrected by hand" and are kept if the old site is imported again.':
        'Се менуваат само податоците што се прикажуваат на веб-страницата и се праќаат на индексните служби; PDF-от останува каков што е објавен. Полињата што ќе ги поправите се означуваат „рачно поправено“ и се задржуваат ако старата страница повторно се увезе.',
    'In the printed order, e.g. "Ana Petrova".':
        'По печатениот редослед, на пр. „Ана Петрова“.',
    'Not set': 'Не е поставено',
    'A changed DOI is checked again with Crossref.':
        'Променет DOI повторно се проверува во Crossref.',
    'Online date': 'Датум на објавување онлајн',
    'Plain text; an empty line starts a new paragraph.':
        'Обичен текст; празен ред започнува нов пасус.',
    'Save the corrections': 'Зачувај ги поправките',
    'Saved.': 'Зачувано.',
    'Not saved: correct the marked fields.':
        'Не е зачувано: поправете ги означените полиња.',
    'Published version (original PDF, old layout)':
        'Објавена верзија (оригинален PDF, стар изглед)',
    'Open in a new tab': 'Отвори во нова картичка',
    'This article has no PDF on the site.': 'Овој труд нема PDF на страницата.',
    'Corrections history': 'Историја на поправки',
    'No corrections yet: the data is as imported from the old site.':
        'Сè уште нема поправки: податоците се како што се увезени од старата страница.',
    before: 'пред',
    after: 'потоа',
    'The published volumes. Each article’s original PDF (old two-column layout) is the official version and is never changed here; you correct the data the website shows and that search and indexing services use.':
        'Објавените томови. Оригиналниот PDF на секој труд (стар изглед во две колони) е официјалната верзија и тука никогаш не се менува; ги поправате податоците што ги прикажува веб-страницата и што ги користат пребарувањето и индексните служби.',
    'DOIs not registered': 'Нерегистрирани DOI',
    'Without an abstract': 'Без апстракт',
    'Without key words': 'Без клучни зборови',
    'Find an article': 'Најдете труд',
    'Title, author, key word, abstract or exact DOI':
        'Наслов, автор, клучен збор, апстракт или точен DOI',
    'Results for “{q}”': 'Резултати за „{q}“',
    'No article matches. Try fewer words.':
        'Ниеден труд не одговара. Обидете се со помалку зборови.',
    'Only the first 50 matches are shown.':
        'Прикажани се само првите 50 резултати.',
    'Volumes and issues': 'Томови и броеви',
    'Volume {n}': 'Том {n}',
    'Early online (issue not complete)': 'Рано онлајн (бројот не е комплетен)',
    'The PDFs are the published versions in the old layout. Edit data corrects only what the website and indexing show.':
        'PDF-овите се објавените верзии во стариот изглед. „Уреди податоци“ поправа само што прикажуваат веб-страницата и индексирањето.',
    'This issue has no articles.': 'Овој број нема трудови.',
    // Archive, read-only.
    'Archived · old layout': 'Архивиран · стар распоред',
    'Archived articles, published as PDFs in the old layout. They are shown as they are and cannot be edited.':
        'Архивирани трудови, објавени како PDF во стариот распоред. Се прикажуваат какви што се и не можат да се уредуваат.',
    'The published volumes, archived as they appeared: each article is its original PDF in the old two-column layout. They are shown as they are and cannot be edited; new manuscripts use the new template.':
        'Објавените томови, архивирани какви што излегле: секој труд е неговиот оригинален PDF во стариот распоред во две колони. Се прикажуваат какви што се и не можат да се уредуваат; новите ракописи го користат новиот шаблон.',
    'Open the PDF in a new tab': 'Отвори го PDF-от во ново јазиче',
    'Published before the manuscript system, in the old two-column layout. The original PDF is the published version; the article is shown as it is and cannot be edited.':
        'Објавен пред системот за ракописи, во стариот распоред во две колони. Оригиналниот PDF е објавената верзија; трудот се прикажува каков што е и не може да се уредува.',
    'Article data': 'Податоци за трудот',
    'No PDF for this article.': 'Нема PDF за овој труд.',
    Type: 'Тип',
    // Issues and publishing
    'Archive and issues': 'Архива и броеви',
    Kind: 'Вид',
    Number: 'Број',
    'The issue starts "in preparation": the articles you publish in it appear on the website under Early online until you close it.':
        'Бројот почнува „во подготовка“: трудовите што ги објавувате во него се појавуваат на веб-страницата под Рано онлајн додека не го затворите.',
    'Open the issue': 'Отвори го бројот',
    'Placed in': 'Ставен во',
    'Not placed in an issue yet.': 'Сè уште не е ставен во број.',
    'No issue is open. Open one under Archive and issues.':
        'Нема отворен број. Отворете еден во Архива и броеви.',
    'Not in an issue': 'Не е во број',
    'Published on the website': 'Објавен на веб-страницата',
    'Fill in the publication details (DOI, pages) before publishing.':
        'Пред објавување пополнете ги податоците за објавување (DOI, страници).',
    'Final PDF': 'Конечен PDF',
    'Publish online…': 'Објави онлајн…',
    'Publish this article online?': 'Да се објави трудот онлајн?',
    'The article will appear on the website under Early online with this PDF; the authors are notified.':
        'Трудот ќе се појави на веб-страницата под Рано онлајн со овој PDF; авторите добиваат известување.',
    'File: {name}': 'Датотека: {name}',
    'Publishing…': 'Се објавува…',
    'Publish online': 'Објави онлајн',
    'Issues in preparation': 'Броеви во подготовка',
    'Place accepted manuscripts in an open issue, publish each online with its final PDF, then close the issue to publish it.':
        'Ставете ги прифатените ракописи во отворен број, објавете го секој онлајн со конечниот PDF, па затворете го бројот за да го објавите.',
    'New issue': 'Нов број',
    'No issue is open. Open one to place accepted manuscripts in it.':
        'Нема отворен број. Отворете еден за да ставите прифатени ракописи во него.',
    'in preparation': 'во подготовка',
    Manage: 'Управувај',
    'Closed — published': 'Затворен — објавен',
    'In preparation (articles appear under Early online)':
        'Во подготовка (трудовите се појавуваат под Рано онлајн)',
    'Archive view': 'Приказ во архивата',
    'Close the issue…': 'Затвори го бројот…',
    'Manuscripts in this issue': 'Ракописи во овој број',
    'In the order they will be printed. Fill in the DOI and pages in each manuscript’s publication details before publishing.':
        'По редоследот по кој ќе се печатат. Пред објавување пополнете ги DOI и страниците во податоците за објавување на секој ракопис.',
    'No manuscripts placed in this issue yet.':
        'Во овој број сè уште нема ракописи.',
    'DOI missing': 'недостасува DOI',
    'pages missing': 'недостасуваат страници',
    'Fill in the publication details': 'Пополнете ги податоците за објавување',
    'Published — view on the website': 'Објавен — види на веб-страницата',
    'Accepted manuscripts waiting for an issue':
        'Прифатени ракописи што чекаат број',
    'No accepted manuscript is waiting.': 'Нема прифатен ракопис што чека.',
    'Add to this issue': 'Додај во овој број',
    'Articles in this issue': 'Трудови во овој број',
    'No articles published in this issue yet.':
        'Во овој број сè уште нема објавени трудови.',
    'Published from the system': 'Објавен од системот',
    'Close this issue?': 'Да се затвори бројот?',
    'The issue becomes the current published issue on the website and can no longer take manuscripts. Publish every manuscript in it first.':
        'Бројот станува тековен објавен број на веб-страницата и повеќе не прима ракописи. Прво објавете го секој ракопис во него.',
    'Close and publish the issue': 'Затвори и објави го бројот',
    'Place in an issue': 'Стави во број',
    'Issue and publishing': 'Број и објавување',
    'Placed in an issue': 'Ставен во број',
    'Removed from the issue': 'Отстранет од бројот',
    PDF: 'PDF',
    'Volume, issue and year are filled in when the manuscript is placed in an issue (above).':
        'Томот, бројот и годината се пополнуваат кога ракописот ќе се стави во број (погоре).',
    'The pages of the article in the printed issue, e.g. 3 and 11: printed as “71 (2) 3 – 11 (2025)” on the article and in citations.':
        'Страниците на трудот во печатениот број, на пр. 3 и 11: се печатат како „71 (2) 3 – 11 (2025)“ на трудот и во цитатите.',
    'Place the manuscript in an issue and enter the article number first.':
        'Прво ставете го ракописот во број и внесете го бројот на трудот.',
    // E-mail templates and the author's status summary
    'E-mail templates': 'Шаблони за е-пораки',
    'E-mail template': 'Шаблон за е-порака',
    'Reset to the original wording': 'Врати го оригиналниот текст',
    'Save both languages': 'Зачувај ги двата јазика',
    Customised: 'Прилагоден',
    'Original wording': 'Оригинален текст',
    Subject: 'Наслов на пораката',
    'Text of the e-mail': 'Текст на е-пораката',
    'Use the original text (not saved until you save)':
        'Користи го оригиналниот текст (не се зачувува додека не зачувате)',
    Placeholders: 'Ознаки за замена',
    'Click one to insert it where the cursor is.':
        'Кликнете на ознака за да ја вметнете каде што е курсорот.',
    'Where the button goes': 'Каде оди копчето',
    'Separate paragraphs with an empty line.':
        'Пасусите одделете ги со празен ред.',
    '{button} places the button; without it the button goes at the end.':
        '{button} го поставува копчето; без него копчето оди на крајот.',
    '**bold** makes text bold.': '**задебелено** го задебелува текстот.',
    'A placeholder with no value (e.g. an empty message) is left out.':
        'Ознака без вредност (на пр. празна порака) се изоставува.',
    'Preview ({language})': 'Преглед ({language})',
    Refresh: 'Освежи',
    'Preparing the preview…': 'Се подготвува прегледот…',
    'Preview of the e-mail': 'Преглед на е-пораката',
    'The preview fills the placeholders with sample values.':
        'Прегледот ги пополнува ознаките со примерни вредности.',
    'Reset to the original wording?': 'Да се врати оригиналниот текст?',
    'The changes in both languages are removed and the system sends the original text again.':
        'Промените на двата јазика се бришат и системот повторно го испраќа оригиналниот текст.',
    Reset: 'Врати',
    'These are the e-mails the system sends. Change the wording in English and Macedonian; {placeholders} are filled in automatically.':
        'Ова се е-пораките што ги испраќа системот. Сменете го текстот на англиски и македонски; {placeholders} се пополнуваат автоматски.',
    'Subject: {subject}': 'Наслов: {subject}',
    'Open to see the article': 'Отворете за да го видите трудот',
    'Where your manuscript is': 'Каде е вашиот ракопис',
    Online: 'Онлајн',
    'Published online on {date}': 'Објавен онлајн на {date}',
    'View your article on the journal website':
        'Видете го вашиот труд на веб-страницата на списанието',
    'To authors': 'До авторите',
    'To reviewers': 'До рецензентите',
    'To the editorial office': 'До редакцијата',
    'Finish the manuscript and send it to the journal.':
        'Довршете го ракописот и испратете го до списанието.',
    'The editorial office is checking the manuscript before review.':
        'Редакцијата го проверува ракописот пред рецензијата.',
    'The manuscript is with the reviewers; the editorial office will write to you with the decision.':
        'Ракописот е кај рецензентите; редакцијата ќе ви пише со одлуката.',
    'Revise the manuscript and submit it again.':
        'Ревидирајте го ракописот и поднесете го повторно.',
    'The editorial office is checking your revision.':
        'Редакцијата ја проверува вашата ревизија.',
    'Accepted: the manuscript is being prepared for publication.':
        'Прифатен: ракописот се подготвува за објавување.',
    'The manuscript is being prepared for publication.':
        'Ракописот се подготвува за објавување.',
    'Published online: you can see the article on the journal website.':
        'Објавен онлајн: трудот можете да го видите на веб-страницата на списанието.',
    'The manuscript was not accepted for publication.':
        'Ракописот не е прифатен за објавување.',
    'The manuscript was withdrawn.': 'Ракописот е повлечен.',
    'Receipt sent to the author who submitted a manuscript.':
        'Потврда за прием до авторот што поднел ракопис.',
    'Name of the recipient': 'Име на примачот',
    'Reference (MPB-2026-0001)': 'Број на ракописот (MPB-2026-0001)',
    'Name of the journal': 'Име на списанието',
    'The editorial decision with the letter written by the editor.':
        'Уредничката одлука со писмото што го напишал уредникот.',
    'The decision (e.g. Minor revision requested)':
        'Одлуката (на пр. Побарана мала ревизија)',
    'The letter written in the decision form':
        'Писмото напишано во формуларот за одлука',
    'A message the editorial office sends to the authors (a note marked "Send to the authors").':
        'Порака што редакцијата ја испраќа до авторите (белешка означена „Испрати до авторите“).',
    'The text of the message': 'Текстот на пораката',
    'The article is published online.': 'Трудот е објавен онлајн.',
    'Volume and issue': 'Том и број',
    'DOI link': 'DOI-врска',
    'Invitation to review, with the personal sign-in link.':
        'Покана за рецензија, со личната врска за најава.',
    'Date to answer by': 'Датум до кој треба да се одговори',
    'Date the review is due': 'Рок за рецензијата',
    'The personal note added when inviting (may be empty)':
        'Личната белешка додадена при поканувањето (може да е празна)',
    'Reminder to answer an invitation (sent automatically or by the editorial office).':
        'Потсетник да се одговори на покана (автоматски или од редакцијата).',
    'Reminder that the review is due soon or overdue.':
        'Потсетник дека рокот за рецензијата е близу или поминал.',
    'The editorial office withdrew an invitation.':
        'Редакцијата повлече покана.',
    'To the editorial office: a new manuscript arrived.':
        'До редакцијата: пристигна нов ракопис.',
    'Submitting author': 'Авторот што поднесува',
    'To the editorial office: the authors sent a revised manuscript.':
        'До редакцијата: авторите испратија ревидиран ракопис.',
    'To the editorial office: a reviewer accepted.':
        'До редакцијата: рецензент прифати.',
    'Name of the reviewer': 'Име на рецензентот',
    'To the editorial office: a reviewer declined.':
        'До редакцијата: рецензент одби.',
    'Reason given (may be empty)': 'Наведена причина (може да е празна)',
    'To the editorial office: a review was submitted.':
        'До редакцијата: испратена е рецензија.',
    'The PDF is made automatically from the manuscript, in the journal layout, with the page numbers, DOI and citation.':
        'PDF-от се прави автоматски од ракописот, во изгледот на списанието, со броевите на страниците, DOI и цитатот.',
    'Preview the PDF': 'Преглед на PDF',
    'Upload our own final PDF instead': 'Наместо тоа, прикачи наш финален PDF',
    'The PDF is made from the manuscript and the article appears on the website under Early online; the authors are notified. Making the PDF takes a few seconds.':
        'PDF-от се прави од ракописот и трудот се појавува на веб-страницата под Early online; авторите се известуваат. Изработката на PDF трае неколку секунди.',
    'Fill in the DOI before publishing. If the first page is empty, the article starts on the page after the last article in the issue.':
        'Пред објавување внесете го DOI. Ако првата страница е празна, трудот почнува на страницата по последниот труд во бројот.',
    'PDF (journal layout)': 'PDF (изглед на списанието)',
    'DOI check': 'Проверка на DOI',
    'A DOI works only after the publisher deposits it at Crossref, the DOI registration agency. The system downloads the list of every DOI deposited under the journal’s prefix {prefix} and compares it with the articles. A DOI that is not on that list does not open at doi.org: readers and indexing services cannot follow it.':
        'DOI работи дури откако издавачот ќе го депонира кај Crossref, агенцијата за регистрација на DOI. Системот ја презема листата на сите DOI депонирани под префиксот на списанието {prefix} и ја споредува со трудовите. DOI што го нема на таа листа не се отвора на doi.org: читателите и индексните бази не можат да стигнат до трудот.',
    'Last compared with Crossref: {date}.':
        'Последна споредба со Crossref: {date}.',
    'Not compared with Crossref yet.': 'Сè уште не е споредено со Crossref.',
    'Each DOI can be checked by hand with the links next to it: doi.org opens the article when the DOI is registered and shows “DOI not found” when it is not.':
        'Секое DOI може да се провери и рачно со линковите до него: doi.org го отвора трудот ако DOI е регистрирано, а покажува „DOI not found“ ако не е.',
    'Not registered: {count}': 'Нерегистрирани: {count}',
    'all {count} articles': 'сите {count} трудови',
    '{count} of {total} articles': '{count} од {total} трудови',
    'Crossref has: {doi}': 'Кај Crossref: {doi}',
    'Open at doi.org': 'Отвори на doi.org',
    'Search at Crossref': 'Барај во Crossref',
    'Registered with a mistake ({count})': 'Регистрирани со грешка ({count})',
    'These DOIs were deposited with a typo, most often the prefix written twice. They work, but only in the mistyped form, which the website uses for its links. The publisher can ask Crossref to correct them.':
        'Овие DOI се депонирани со печатна грешка, најчесто префиксот е напишан двапати. Работат, но само во погрешната форма, која веб-страницата ја користи за линковите. Издавачот може да побара од Crossref да ги поправи.',
    Printed: 'Испечатено',
    Registered: 'Регистрирано',
    'See which and why': 'Види кои и зошто',
    'Not found at Crossref': 'Го нема кај Crossref (не е депонирано)',
    'This DOI is registered for a different PDF':
        'Ова DOI е регистрирано за друг PDF (друг труд)',
    "This PDF is registered under another article's DOI":
        'Овој PDF е регистриран под DOI на друг труд',
    'This PDF is registered under a mistyped DOI':
        'Овој PDF е регистриран под погрешно напишано DOI',
    'Crossref settings': 'Поставки за Crossref',
    'Crossref account connected — TEST system: deposits are checked but nothing is registered.':
        'Crossref сметката е поврзана — ТЕСТ систем: депонирањата се проверуваат, но ништо не се регистрира.',
    'Crossref account connected: deposits are sent from here.':
        'Crossref сметката е поврзана: депонирањата се праќаат од тука.',
    'No Crossref account is entered (below). Until then, download the XML of an issue and upload it at Crossref (doi.crossref.org → Submissions → Upload, type Metadata).':
        'Не е внесена Crossref сметка (подолу). Дотогаш, симнете го XML-фајлот за бројот и прикачете го кај Crossref (doi.crossref.org → Submissions → Upload, тип Metadata).',
    'DOIs lead to the article PDF, as in all earlier deposits.':
        'DOI-ата водат до PDF-от на трудот, како кај сите досегашни депонирања.',
    'DOIs lead to the article page on the website.':
        'DOI-ата водат до страницата на трудот на веб-сајтот.',
    'Depositor (person or institution)': 'Депонент (лице или институција)',
    'Depositor e-mail (Crossref sends the results there)':
        'Е-адреса на депонентот (Crossref таму ги праќа резултатите)',
    'Register the DOI automatically when an article is published online':
        'Автоматски регистрирај го DOI-то кога трудот ќе се објави онлајн',
    'Nothing to deposit here.': 'Нема што да се депонира.',
    'Crossref XML ({count} DOIs)': 'Crossref XML ({count} DOI)',
    'Send to Crossref': 'Испрати до Crossref',
    'waiting to be sent': 'чека да се испрати',
    'sent, waiting for Crossref': 'испратено, се чека Crossref',
    'partly registered': 'делумно регистрирано',
    failed: 'неуспешно',
    Deposits: 'Депонирања',
    '{count} DOIs': '{count} DOI',
    test: 'тест',
    'automatic, on publishing': 'автоматски, при објавување',
    'Articles whose DOI is registered for another PDF are left out: check them by hand first.':
        'Трудовите чие DOI е регистрирано за друг PDF се изоставени: прво проверете ги рачно.',
    'DOI registration (Crossref)': 'Регистрација на DOI (Crossref)',
    'A DOI works only after it is deposited at Crossref. Download the file and upload it at Crossref, or send it from here when the Crossref account is set up.':
        'DOI работи дури откако ќе се депонира кај Crossref. Симнете го фајлот и прикачете го кај Crossref, или испратете го од тука кога Crossref сметката е поставена.',
    'DOI check and Crossref settings': 'Проверка на DOI и поставки за Crossref',
    'These DOIs were deposited at Crossref with a typo, most often the prefix written twice. The DOI printed on the article does not open; only the mistyped form does (the website links to it for now). The fix: deposit the issue again, which registers the DOIs as printed. Afterwards the publisher can ask Crossref support to alias the mistyped DOIs to the right ones.':
        'Овие DOI се депонирани кај Crossref со печатна грешка, најчесто префиксот е напишан двапати. DOI-то испечатено на трудот не се отвора; се отвора само погрешната форма (засега сајтот води до неа). Решение: бројот повторно се депонира, со што DOI-ата се регистрираат како што се испечатени. Потоа издавачот може да побара од Crossref support погрешните DOI да се поврзат (alias) со точните.',
    'Printed (does not open)': 'Испечатено (не се отвора)',
    'Registered (opens)': 'Регистрирано (се отвора)',
    'Open printed at doi.org': 'Отвори го испечатеното на doi.org',
    'Open registered at doi.org': 'Отвори го регистрираното на doi.org',
    'Crossref account': 'Crossref сметка',
    'With the account entered here the system sends the deposits to Crossref itself (the buttons “Send to Crossref” and the automatic registration on publishing). Use the account of the Macedonian Pharmaceutical Association (member 18202), best a separate role for this system. The password is stored encrypted and is never shown again.':
        'Со сметката внесена тука системот сам ги праќа депонирањата до Crossref (копчињата „Испрати до Crossref“ и автоматската регистрација при објавување). Користете ја сметката на Македонското фармацевтско друштво (член 18202), најдобро посебна улога (role) за овој систем. Лозинката се чува шифрирана и никогаш повеќе не се прикажува.',
    'An account is set on the server (.env). An account entered here takes its place.':
        'На серверот е поставена сметка (.env). Сметката внесена тука ја заменува.',
    'Crossref username': 'Crossref корисничко име',
    'Crossref password': 'Crossref лозинка',
    'Saved — leave empty to keep it': 'Зачувана — оставете празно за да остане',
    'Where deposits go': 'Каде одат депонирањата',
    'Test system': 'Тест-систем',
    '— Crossref checks the file and answers, but registers nothing. Start here.':
        '— Crossref го проверува фајлот и одговара, но ништо не регистрира. Почнете од тука.',
    Live: 'Вистински',
    '— the DOIs are really registered (Crossref charges its fee per DOI).':
        '— DOI-ата навистина се регистрираат (Crossref наплатува такса по DOI).',
    'Save the account': 'Зачувај ја сметката',
    'Remove the account': 'Отстрани ја сметката',
    'e-mail/role': 'е-адреса/улога',
    'If you sign in to Crossref with your e-mail address, add the role after a slash: e-mail/role. The role is shown when you sign in at doi.crossref.org.':
        'Ако во Crossref се најавувате со е-адреса, по коса црта додадете ја улогата (role): е-адреса/улога. Улогата се гледа кога ќе се најавите на doi.crossref.org.',
    'Crossref processes deposits in its queue, usually within minutes; the system asks every ten minutes.':
        'Crossref ги обработува депонирањата во својот ред, обично за неколку минути; системот прашува на секои десет минути.',
    'Ask Crossref now': 'Прашај го Crossref сега',
    XML: 'XML',
    'Send this one': 'Испрати го овој',
};

export default mk;
