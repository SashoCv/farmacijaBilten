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
};

export default mk;
