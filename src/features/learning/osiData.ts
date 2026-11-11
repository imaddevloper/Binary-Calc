export interface OsiLayer {
  id: number;
  name: string;
  ar: string;
  summary: string;
  summaryAr: string;
  purpose: string;
  purposeAr: string;
  duties: string[];
  dutiesAr: string[];
  analogy: string;
  analogyAr: string;
  technologies: string[];
  example: string;
  exampleAr: string;
  misconception: string;
  misconceptionAr: string;
  question: string;
  questionAr: string;
  options: string[];
  optionsAr: string[];
  answer: number;
  explanation: string;
  explanationAr: string;
}

export const OSI_LAYERS: OsiLayer[] = [
  {
    id: 7, name: 'Application', ar: 'التطبيق',
    summary: 'Provides network services to user-facing applications.',
    summaryAr: 'توفّر خدمات الشبكة للتطبيقات التي يتعامل معها المستخدم.',
    purpose: 'It defines how application software requests and exchanges network information.',
    purposeAr: 'تحدد كيفية طلب البرامج للمعلومات عبر الشبكة وتبادلها.',
    duties: ['Application protocols and service requests', 'Web, name and mail services', 'Formatting application-level messages'],
    dutiesAr: ['بروتوكولات التطبيقات وطلبات الخدمات', 'خدمات الويب والأسماء والبريد', 'تنسيق رسائل مستوى التطبيق'],
    analogy: 'The service desk where a person asks for a particular service.',
    analogyAr: 'مكتب الخدمة الذي يطلب منه الشخص خدمة محددة.',
    technologies: ['HTTP', 'HTTPS', 'DNS', 'SMTP'],
    example: 'A browser uses HTTPS to request a web page from a server.',
    exampleAr: 'يستخدم المتصفح HTTPS لطلب صفحة ويب من خادم.',
    misconception: 'The Application layer is not the app interface itself; it describes network services and protocols used by applications.',
    misconceptionAr: 'طبقة التطبيق ليست واجهة التطبيق نفسها؛ بل تصف خدمات وبروتوكولات الشبكة التي تستخدمها التطبيقات.',
    question: 'Which protocol is commonly used to request web pages securely?',
    questionAr: 'أي بروتوكول يُستخدم عادةً لطلب صفحات الويب بشكل آمن؟',
    options: ['HTTPS', 'Ethernet', 'ARP'], optionsAr: ['HTTPS', 'Ethernet', 'ARP'],
    answer: 0, explanation: 'HTTPS protects HTTP communication with TLS.',
    explanationAr: 'يحمي HTTPS اتصال HTTP باستخدام TLS.',
  },
  {
    id: 6, name: 'Presentation', ar: 'العرض',
    summary: 'Represents data in formats that communicating systems can understand.',
    summaryAr: 'تمثّل البيانات بصيغ تستطيع الأنظمة المتصلة فهمها.',
    purpose: 'It concerns data representation, character encoding, serialization and encryption concepts.',
    purposeAr: 'تهتم بتمثيل البيانات وترميز الأحرف والتسلسل ومفاهيم التشفير.',
    duties: ['Character and data encoding', 'Data serialization and format conversion', 'Encryption and compression concepts'],
    dutiesAr: ['ترميز الأحرف والبيانات', 'تسلسل البيانات وتحويل الصيغ', 'مفاهيم التشفير والضغط'],
    analogy: 'A translator who converts a message into a format both sides can read.',
    analogyAr: 'مترجم يحوّل الرسالة إلى صيغة يستطيع الطرفان قراءتها.',
    technologies: ['UTF-8', 'JSON', 'ASN.1', 'TLS concepts'],
    example: 'UTF-8 represents text consistently across different operating systems.',
    exampleAr: 'يمثل UTF-8 النص بطريقة متسقة عبر أنظمة تشغيل مختلفة.',
    misconception: 'TLS is implemented across real protocol stacks in ways that do not map perfectly to one OSI layer.',
    misconceptionAr: 'يُنفّذ TLS في مكدسات البروتوكولات الواقعية بطريقة لا تنحصر تماماً في طبقة OSI واحدة.',
    question: 'Which is a character encoding standard?',
    questionAr: 'أي مما يلي معيار لترميز الأحرف؟',
    options: ['UTF-8', 'IP', 'TCP'], optionsAr: ['UTF-8', 'IP', 'TCP'],
    answer: 0, explanation: 'UTF-8 encodes Unicode characters as bytes.',
    explanationAr: 'يرمّز UTF-8 محارف Unicode إلى بايتات.',
  },
  {
    id: 5, name: 'Session', ar: 'الجلسة',
    summary: 'Coordinates conversations and dialog between communicating applications.',
    summaryAr: 'تنسّق المحادثات والحوار بين التطبيقات المتصلة.',
    purpose: 'It describes establishing, managing and ending logical communication sessions.',
    purposeAr: 'تصف إنشاء جلسات الاتصال المنطقية وإدارتها وإنهاءها.',
    duties: ['Session establishment and termination', 'Dialog control and synchronization', 'Checkpoint and recovery concepts'],
    dutiesAr: ['إنشاء الجلسات وإنهاؤها', 'التحكم في الحوار والمزامنة', 'مفاهيم نقاط الاستعادة والتعافي'],
    analogy: 'A meeting coordinator who starts a meeting, manages turns and closes it.',
    analogyAr: 'منسق اجتماع يبدأه وينظم أدوار الحديث ثم ينهيه.',
    technologies: ['RPC concepts', 'Session tokens', 'Dialog control'],
    example: 'A remote procedure call can maintain context while a client and service exchange requests.',
    exampleAr: 'يمكن لاستدعاء إجراء بعيد الحفاظ على السياق أثناء تبادل الطلبات بين العميل والخدمة.',
    misconception: 'Modern TCP/IP stacks do not always implement a separate Session layer.',
    misconceptionAr: 'لا تنفّذ مكدسات TCP/IP الحديثة دائماً طبقة جلسة مستقلة.',
    question: 'Which task best matches the Session layer model?',
    questionAr: 'أي مهمة تتوافق أكثر مع نموذج طبقة الجلسة؟',
    options: ['Managing a dialog', 'Forwarding IP packets', 'Sending electrical signals'],
    optionsAr: ['إدارة الحوار', 'تمرير حزم IP', 'إرسال الإشارات الكهربائية'],
    answer: 0, explanation: 'The Session layer model coordinates dialogs and session state.',
    explanationAr: 'ينسّق نموذج طبقة الجلسة الحوار وحالة الجلسة.',
  },
  {
    id: 4, name: 'Transport', ar: 'النقل',
    summary: 'Provides end-to-end transport between application processes.',
    summaryAr: 'توفر نقلاً بين العمليات التطبيقية من طرف إلى طرف.',
    purpose: 'It segments data and may provide reliability, ordering, flow control and multiplexing.',
    purposeAr: 'تقسّم البيانات وقد توفر الموثوقية والترتيب والتحكم في التدفق وتعدد الإرسال.',
    duties: ['Ports and process-to-process delivery', 'Segmentation and reassembly', 'Reliability and flow control where supported'],
    dutiesAr: ['المنافذ والتوصيل بين العمليات', 'تقسيم البيانات وإعادة تجميعها', 'الموثوقية والتحكم في التدفق عند دعمهما'],
    analogy: 'A delivery service that tracks individual parcels sent to different departments.',
    analogyAr: 'خدمة توصيل تتعقب الطرود المرسلة إلى أقسام مختلفة.',
    technologies: ['TCP', 'UDP', 'Ports'],
    example: 'TCP provides ordered reliable byte-stream delivery; UDP provides datagrams without delivery guarantees.',
    exampleAr: 'يوفر TCP تدفق بايتات موثوقاً ومرتباً؛ أما UDP فيوفر مخططات بيانات دون ضمان التسليم.',
    misconception: 'UDP does not guarantee delivery or ordering; TCP and UDP are not interchangeable.',
    misconceptionAr: 'لا يضمن UDP التسليم أو الترتيب؛ لذلك لا يمكن اعتبار TCP وUDP متطابقين.',
    question: 'Which transport protocol provides reliable ordered delivery?',
    questionAr: 'أي بروتوكول نقل يوفر تسليماً موثوقاً ومرتباً؟',
    options: ['UDP', 'TCP', 'ARP'], optionsAr: ['UDP', 'TCP', 'ARP'],
    answer: 1, explanation: 'TCP provides reliability and ordered delivery; UDP does not.',
    explanationAr: 'يوفر TCP الموثوقية والترتيب، بينما لا يضمنهما UDP.',
  },
  {
    id: 3, name: 'Network', ar: 'الشبكة',
    summary: 'Moves packets between networks using logical addressing and routing.',
    summaryAr: 'تنقل الحزم بين الشبكات باستخدام العنونة المنطقية والتوجيه.',
    purpose: 'It selects paths and next hops so packets can travel beyond the local network.',
    purposeAr: 'تحدد المسارات والقفزة التالية حتى تتمكن الحزم من تجاوز الشبكة المحلية.',
    duties: ['IPv4 and IPv6 addressing', 'Routing and packet forwarding', 'Subnetting, TTL and ICMP concepts'],
    dutiesAr: ['عنونة IPv4 وIPv6', 'التوجيه وتمرير الحزم', 'التقسيم إلى شبكات ومفاهيم TTL وICMP'],
    analogy: 'A road map that chooses which route connects two cities.',
    analogyAr: 'خريطة طرق تختار المسار الذي يربط بين مدينتين.',
    technologies: ['IPv4', 'IPv6', 'ICMP', 'Routers'],
    example: 'A router forwards a packet toward the destination network using its routing table.',
    exampleAr: 'يمرر الموجّه الحزمة نحو شبكة الوجهة اعتماداً على جدول التوجيه.',
    misconception: 'An IP address identifies a logical interface/address, not a person or a permanent physical device.',
    misconceptionAr: 'عنوان IP يحدد عنواناً منطقياً لواجهة شبكة، وليس هوية شخص أو جهاز مادية دائمة.',
    question: 'Which device primarily forwards IP packets between networks?',
    questionAr: 'أي جهاز يمرر حزم IP بين الشبكات بشكل أساسي؟',
    options: ['Switch (Layer 2)', 'Router', 'Repeater'],
    optionsAr: ['مبدّل Switch (الطبقة 2)', 'موجّه Router', 'مكرر إشارة'],
    answer: 1, explanation: 'Routers use network-layer information and routing tables to forward packets.',
    explanationAr: 'تستخدم الموجّهات معلومات طبقة الشبكة وجداول التوجيه لتمرير الحزم.',
  },
  {
    id: 2, name: 'Data Link', ar: 'ربط البيانات',
    summary: 'Transfers frames across a local link and uses link-layer addressing.',
    summaryAr: 'تنقل الإطارات عبر وصلة محلية وتستخدم عناوين طبقة الربط.',
    purpose: 'It organizes bits into frames and controls access to a local medium.',
    purposeAr: 'تنظم البتات في إطارات وتتحكم في الوصول إلى الوسط المحلي.',
    duties: ['Ethernet frames and MAC addresses', 'Switching and MAC learning', 'VLANs and error detection with FCS/CRC'],
    dutiesAr: ['إطارات Ethernet وعناوين MAC', 'التحويل وتعلّم عناوين MAC', 'شبكات VLAN وكشف الأخطاء عبر FCS/CRC'],
    analogy: 'A local building mailroom that sorts parcels by room number.',
    analogyAr: 'مكتب بريد داخل مبنى يفرز الطرود حسب رقم الغرفة.',
    technologies: ['Ethernet', 'Wi-Fi MAC', '802.1Q VLAN', 'Switches'],
    example: 'A switch learns source MAC addresses and forwards a frame to the matching port.',
    exampleAr: 'يتعلم المبدّل عناوين MAC المصدرية ثم يمرر الإطار إلى المنفذ المناسب.',
    misconception: 'ARP supports IPv4 neighbor address resolution; its placement in layered models needs careful explanation.',
    misconceptionAr: 'يساعد ARP في اكتشاف عنوان الجار في IPv4؛ ويجب شرح موضعه في النماذج الطبقية بدقة.',
    question: 'What address does an Ethernet switch learn to build its forwarding table?',
    questionAr: 'ما العنوان الذي يتعلمه مبدّل Ethernet لبناء جدول التمرير؟',
    options: ['MAC address', 'TCP port', 'IPv4 subnet mask'],
    optionsAr: ['عنوان MAC', 'منفذ TCP', 'قناع شبكة IPv4'],
    answer: 0, explanation: 'A learning switch records source MAC addresses and the ports where they were seen.',
    explanationAr: 'يسجل المبدّل المتعلم عناوين MAC المصدرية والمنافذ التي ظهرت عليها.',
  },
  {
    id: 1, name: 'Physical', ar: 'الفيزيائية',
    summary: 'Transmits raw bits as electrical, optical or radio signals.',
    summaryAr: 'تنقل البتات الخام على شكل إشارات كهربائية أو ضوئية أو لاسلكية.',
    purpose: 'It defines physical media, signaling, connectors and transmission characteristics.',
    purposeAr: 'تحدد وسائط النقل والإشارات والموصلات وخصائص الإرسال.',
    duties: ['Bits and signal transmission', 'Copper, fiber and radio media', 'Connectors, repeaters and link speed'],
    dutiesAr: ['نقل البتات والإشارات', 'وسائط النحاس والألياف والراديو', 'الموصلات ومكررات الإشارة وسرعة الوصلة'],
    analogy: 'The road surface and physical route on which a vehicle can travel.',
    analogyAr: 'سطح الطريق والمسار المادي الذي تسير عليه المركبة.',
    technologies: ['UTP cable', 'Fiber optics', 'Radio waves', 'Repeaters'],
    example: 'An Ethernet cable carries electrical signals between a device and a switch.',
    exampleAr: 'ينقل كابل Ethernet إشارات كهربائية بين الجهاز والمبدّل.',
    misconception: 'The Physical layer carries signals; it does not interpret IP addresses or application messages.',
    misconceptionAr: 'تنقل الطبقة الفيزيائية الإشارات ولا تفسر عناوين IP أو رسائل التطبيقات.',
    question: 'Which item belongs most directly to the Physical layer?',
    questionAr: 'أي عنصر ينتمي مباشرةً إلى الطبقة الفيزيائية؟',
    options: ['IP address', 'Fiber-optic cable', 'TCP port'],
    optionsAr: ['عنوان IP', 'كابل ألياف ضوئية', 'منفذ TCP'],
    answer: 1, explanation: 'Fiber is a physical transmission medium that carries optical signals.',
    explanationAr: 'الألياف الضوئية وسط مادي ينقل الإشارات الضوئية.',
  },
];

export const OSI_ROADMAP = [
  { en: 'Networking foundations', ar: 'أساسيات الشبكات', time: '45 min', detail: 'Hosts, networks, protocols and data flow', detailAr: 'الأجهزة والشبكات والبروتوكولات وتدفق البيانات' },
  { en: 'Layers 1–2: access', ar: 'الطبقتان 1 و2: الوصول', time: '90 min', detail: 'Signals, Ethernet, frames, MAC and switching', detailAr: 'الإشارات وEthernet والإطارات وMAC والتحويل' },
  { en: 'Layer 3: IP networking', ar: 'الطبقة 3: شبكات IP', time: '120 min', detail: 'IPv4, subnetting, routing and ICMP', detailAr: 'IPv4 والتقسيم والتوجيه وICMP' },
  { en: 'Layer 4: transport', ar: 'الطبقة 4: النقل', time: '75 min', detail: 'TCP, UDP, ports and reliability', detailAr: 'TCP وUDP والمنافذ والموثوقية' },
  { en: 'Layers 5–7: application services', ar: 'الطبقات 5–7: خدمات التطبيقات', time: '90 min', detail: 'Sessions, data formats, DNS and HTTPS', detailAr: 'الجلسات وصيغ البيانات وDNS وHTTPS' },
  { en: 'Encapsulation and practical review', ar: 'التغليف والمراجعة العملية', time: '60 min', detail: 'Follow data from an app to the physical medium', detailAr: 'تتبّع البيانات من التطبيق إلى وسيط النقل' },
];

export const OSI_GLOSSARY = [
  ['Bit', 'A single binary digit: 0 or 1.', 'رقم ثنائي واحد: 0 أو 1.'],
  ['Frame', 'A Layer 2 data unit.', 'وحدة بيانات في الطبقة الثانية.'],
  ['Packet', 'A common name for a Layer 3 data unit.', 'اسم شائع لوحدة بيانات الطبقة الثالثة.'],
  ['MAC address', 'A link-layer address used on a local network.', 'عنوان في طبقة الربط يُستخدم داخل الشبكة المحلية.'],
  ['IP address', 'A logical address used for network-layer communication.', 'عنوان منطقي لاتصالات طبقة الشبكة.'],
  ['Port', 'A transport-layer identifier for an application endpoint.', 'معرّف في طبقة النقل لنقطة اتصال التطبيق.'],
  ['Encapsulation', 'Wrapping data with layer-specific control information.', 'إضافة معلومات تحكم خاصة بكل طبقة حول البيانات.'],
];

export const OSI_PATHS = [
  { name: 'Cisco networking fundamentals', url: 'https://learningnetwork.cisco.com/' },
  { name: 'CompTIA Network+', url: 'https://www.comptia.org/certifications/network' },
  { name: 'Juniper documentation', url: 'https://www.juniper.net/documentation/' },
  { name: 'Microsoft Learn', url: 'https://learn.microsoft.com/' },
  { name: 'AWS documentation', url: 'https://docs.aws.amazon.com/' },
  { name: 'Cloudflare Learning Center', url: 'https://www.cloudflare.com/learning/' },
  { name: 'Wireshark documentation', url: 'https://www.wireshark.org/docs/' },
  { name: 'Linux man-pages', url: 'https://man7.org/linux/man-pages/' },
];

export const OSI_REFERENCES = [
  { title: 'IETF RFC Editor — Internet standards and RFCs', url: 'https://www.rfc-editor.org/' },
  { title: 'IEEE — Networking and Ethernet standards', url: 'https://www.ieee.org/' },
  { title: 'Cisco Learning Network — Networking education', url: 'https://learningnetwork.cisco.com/' },
  { title: 'Wireshark documentation — Packet analysis', url: 'https://www.wireshark.org/docs/' },
];
