// 中文文案字典。页面模板里不写死任何文案，全部从这里取（W7：英文版以后加 en.ts，结构照抄）。
// 文案是占位稿：标语与各段措辞最终交 Claude Design 裁（见 doc/官网 草案 §九 W5）。
// 写法约定：只写**已经上线**的能力；没做完的不写（例：Skill 能力模块未开工，所以没有它）。

import { brand as B } from '../brand';

export const zh = {
  lang: 'zh-CN',
  brand: B.productName,
  homeLabel: `${B.productName}首页`,

  site: {
    title: `${B.productName} · 私人 AI 助手`,
    description: `你只管开口。记住、安排、执行、保管，${B.productName}在你看不见的地方把事办完。电脑、手机、平板都是它的手。`,
    nav: [
      { href: '/features/', label: '功能' },
      { href: '/download/', label: '下载' },
      { href: '/pricing/', label: '定价' },
      { href: '/studio/', label: 'Studio' },
      { href: '/plugins/', label: '插件' },
    ],
    login: '登录',
    skip: '跳到正文',
    footer: {
      groups: [
        {
          title: '产品',
          links: [
            { href: '/features/', label: '全部功能' },
            { href: '/download/', label: '下载' },
            { href: '/pricing/', label: '会员与积分' },
            { href: '/studio/', label: B.studioName },
            { href: '/plugins/', label: '插件与主题' },
          ],
        },
        {
          title: '支持',
          links: [
            { href: '/help/', label: '帮助' },
            { href: '/changelog/', label: '更新日志' },
            { href: '/about/', label: '关于我们' },
          ],
        },
        {
          title: '条款',
          links: [
            { href: '/privacy/', label: '隐私政策' },
            { href: '/terms/', label: '用户协议' },
          ],
        },
      ],
      copyright: `© 2026 ${B.productName}`,
    },
    notFound: { title: '这里什么都没有', body: '这个页面不存在，可能是链接写错了，或者它已经搬走了。', back: '回到首页' },
  },

  home: {
    gaugeLabel: '下潜深度',
    gaugeJump: '跳到',
    sections: [
      {
        id: 'surface',
        depth: 0,
        zone: '海平面',
        eyebrow: `${B.productName} · 私人 AI 助手`,
        title: '说一句，\n剩下的在水面下。',
        // 名字故事的「两三句」版（sam 10-23 原稿，按产品实际改写：对话走云端模型、登录后会同步、执勤会推送）。
        body: `${B.productName}是你的私人 AI 助手。它记得你说过的话、整理你的笔记、跑掉那些重复的小事；保险箱不登录也能用，在你的设备上加密，我们也打不开。像一只停在枝头的小鸟，你叫它它就在，不叫它它就安静待着，有结果才来找你。`,
        cta: [
          { href: '/download/', label: `下载${B.productName}`, primary: true },
          { href: '#dive', label: '往下潜 ↓' },
        ],
      },
      {
        id: 'dive',
        depth: 5,
        zone: '入水',
        eyebrow: '−5 m · 入水 · 21 °C · 1.5 atm',
        title: '水面上是一句话。\n水面下是一整件事。',
        say: { who: '你 · 在手机上', text: '把这周的报销整理好，周五下午提醒我交。' },
        steps: [
          { at: '14:02', text: '拆成三步，派给你的电脑' },
          { at: '14:03', text: '从邮箱和截图里找出 11 张票据' },
          { at: '14:06', text: '记进经营账本，生成报销单' },
          { at: '周五 15:00', text: '提醒你交（已排进执勤表）' },
        ],
      },
      {
        id: 'photic',
        depth: 30,
        zone: '透光层',
        eyebrow: '−30 m · 透光层 · 20 °C · 4 atm',
        title: '交代一件事，它分步做完',
        body: '拆成步骤，派给合适的设备，每一步实时回报。到点的事交给执勤表，它会自己醒来去做。',
        chips: ['任务编排', '执勤表', '提醒', '电脑操控'],
        more: { href: '/features/tasks/', label: '了解任务与执勤表' },
      },
      {
        id: 'twilight',
        depth: 200,
        zone: '暮光层',
        eyebrow: '−200 m · 暮光层 · 12 °C · 21 atm',
        title: '它记得，也读过',
        body: '你说过的偏好、聊过的项目、存进来的资料，会慢慢沉下来，变成它下次回答你的底气。随手记的灵感，它帮你整理、帮你去查。',
        chips: ['长期记忆', '知识库', '灵感'],
        more: { href: '/features/memory/', label: '了解记忆与知识库' },
      },
      {
        id: 'midnight',
        depth: 1000,
        zone: '午夜层',
        eyebrow: '−1000 m · 午夜层 · 4 °C · 101 atm',
        title: '越深，越安全',
        body: '密码保险箱用主密码加 Secret Key 在你的设备上加密。服务器上只存密文，我们也打不开。不登录，它照样能用。',
        chips: ['端到端加密', '自动填充', '单机可用'],
        more: { href: '/features/vault/', label: '了解保险箱' },
      },
      {
        id: 'abyss',
        depth: 4000,
        zone: '深渊层',
        eyebrow: '−4000 m · 深渊层 · 2 °C · 401 atm',
        title: '每台设备，连在同一张网上',
        body: `手机上说，电脑上做。人不在电脑前，也能远程看见、操作它。能力用插件扩展；想自己做设计，还有跑在本机的${B.studioName}。`,
        chips: ['多设备协同', '远程控制', '插件与主题', B.studioName],
        more: { href: '/features/devices/', label: '了解多设备与远程控制' },
      },
      {
        id: 'seabed',
        depth: 4800,
        zone: '海底',
        eyebrow: '−4800 m · 海底',
        title: '到底了。\n现在，浮上去用它。',
        body: '会员管 AI 额度，积分买插件和道具。新用户第一次用 AI 送 7 天会员。',
        more: { href: '/pricing/', label: '查看会员与积分' },
      },
    ],
    // 海底那张网上的节点名（画在 canvas 里）
    netLabels: ['服务端', '手机', '平板', '电脑', 'Studio', '插件', '远程控制'],
    reducedNote: '你的系统设置了「减少动态效果」，这一页不播动画。',
  },

  features: {
    title: '功能',
    lead: `对话只是水面。下面这些，是${B.productName}每天替你做的事。`,
    moreLabel: '了解更多',
    shotPending: '截图整理中',
    related: '相关功能',
    items: [
      {
        slug: 'tasks',
        name: '任务与执勤表',
        short: '交代一件事，它拆步骤、派设备、实时回报；到点的事自己醒来做。',
        eyebrow: '对话 · 任务 · 执勤表 · 提醒',
        title: '交代一件事，\n它分步做完。',
        lead: `你用一句话说清楚要什么。${B.productName}把它拆成步骤，挑合适的设备去做，每一步都告诉你进展到哪了。`,
        shot: 'chat-task',
        phone: 'ios-2',
        chapters: [
          { title: '一句话变成一张任务单', body: '复杂的事会被拆成几步，每一步写清楚交给哪台设备、用什么能力去做。你能看到整张单子，也能随时停下或重来。' },
          { title: '进度实时回到你手上', body: '电脑在跑的时候，手机上能看到它做到第几步、卡在哪里。做完的产物直接回到对话里，能下载、能接着改。' },
          { title: '执勤表：到点自己醒来', body: '定时的事、周期的事交给执勤表。到点它自己起来干活，没变化就安静，有结果才来找你。' },
          { title: '提醒不会漏', body: '提醒在手机、电脑之间同步，通知、角标、桌面小组件都有。没登录也能用，登录后再同步。' },
        ],
        specs: ['任务可以暂停、重试、取消', '执勤表支持定时与周期', '提醒有 iOS 小组件', '电脑操控：AI 在你的电脑上点、输入、读屏幕'],
        related: ['devices', 'memory'],
      },
      {
        slug: 'memory',
        name: '记忆与知识库',
        short: '记得你说过的话，读过你存的资料，能在回答里引用出处。',
        eyebrow: '长期记忆 · 知识库 · 灵感',
        title: '它记得，\n也读过。',
        lead: '你提过的偏好、聊过的项目，会沉淀成长期记忆。你存进知识库的资料，它读过、能找到、能引用。',
        shot: 'memory-knowledge',
        phone: '',
        chapters: [
          { title: '长期记忆', body: '聊过的事会被整理成你的画像和记忆，下次不用从头讲。记住了什么，你都能看、能改、能删。' },
          { title: '知识库', body: '把文档、笔记放进知识库，它会切分、建索引。问到相关的问题时先查资料再回答，并告诉你出自哪一份。' },
          { title: '灵感', body: '随手记的一句话也有地方放。它会帮你归类整理；你说「帮我查查」，它就去调研，结果回到这条灵感下面。' },
        ],
        specs: ['知识库在电脑和手机上都能查', '电脑上的知识库就是一个文件夹，和服务器用 git 同步', '灵感不登录也能记', '记忆可查看、可删除'],
        related: ['tasks', 'vault'],
      },
      {
        slug: 'vault',
        name: '密码保险箱',
        short: '主密码加 Secret Key 本机加密，服务器只存密文。',
        eyebrow: '端到端加密 · 自动填充 · 单机可用',
        title: '越深，\n越安全。',
        lead: '保险箱里的东西在你的设备上加密以后才离开设备。服务器只负责保存和同步密文，没有你的主密码和 Secret Key，谁也打不开。',
        shot: 'vault',
        phone: '',
        chapters: [
          { title: '两把钥匙', body: '主密码在你脑子里，Secret Key 在你的设备上。两样合在一起才能解开保险箱，所以就算服务器被拖库，拿走的也只是一堆密文。' },
          { title: '手机上自动填充', body: 'iPhone 上可以直接用系统的自动填充，从保险箱里填账号密码。面容 ID 解锁，离开一会儿自动上锁。' },
          { title: '不登录也能用', body: '保险箱可以只放在本机，不登录、不同步。想换设备了，登录以后再同步过去。' },
          { title: '在快捷入口里搜', body: '电脑上按 ⌥Space 唤起快捷入口，解锁状态下直接搜记录，回车复制密码。' },
        ],
        specs: ['零知识端到端加密', '多个保险库分开放', '生物识别解锁、自动锁定', '复制的密码 20 秒后自动清掉'],
        related: ['launcher', 'devices'],
      },
      {
        slug: 'ledger',
        name: '记账',
        short: '截图就能记账，生活账和经营账分开，统计在本机算。',
        eyebrow: '生活账本 · 经营账本 · 周期记账',
        title: '截个图，\n这笔账就记好了。',
        lead: '付款截图、发票照片丢给它，金额、分类、日期自己认出来。生活账和经营账分开记，互不打扰。',
        shot: 'ledger',
        phone: 'ios',
        chapters: [
          { title: '截图记账', body: '把付款截图或发票拍给它，它识别出金额、商家和日期，归到合适的分类。认错了改一下就行，原图留着备查。' },
          { title: '生活账本，不登录也能记', body: '生活账本先存在你的设备上，统计也在本机算。登录以后再同步，换手机也不丢。' },
          { title: '经营账本', body: '给做小生意、接私活的人：收入、支出、凭证分开记，按主体管理，月底对账不用翻聊天记录。' },
          { title: '周期记账', body: '房租、订阅这种每月固定的钱，设一次规则，到日子自动记上。' },
        ],
        specs: ['生活账本单机可用', '凭证图片随账保存', '周期规则到点补记', '截图识别需要登录（用到服务端 AI）'],
        related: ['tasks', 'devices'],
      },
      {
        slug: 'remote',
        name: '远程控制',
        short: '人不在电脑前，也能用手机看见、操作它。',
        eyebrow: '远程看屏 · 远程操作 · 和 AI 不抢鼠标',
        title: '人不在电脑前，\n电脑也在你手里。',
        lead: '用 iPhone 或另一台电脑连上你的电脑，看它的屏幕、点它、在上面打字。',
        shot: 'remote',
        phone: '',
        chapters: [
          { title: '手机当触控板', body: '触摸模式直接点哪里是哪里，触控板模式像用笔记本一样移动光标。修饰键栏、系统键盘都有，中文整段发送。' },
          { title: '先只看，再接管', body: '连上默认只看。要动手的时候再接管，电脑那边会明确提示「正在被远程操作」。' },
          { title: '和 AI 不抢鼠标', body: 'AI 正在你电脑上做事时，你一接管它就暂停；你松手或切回只看，它接着做。' },
          { title: '能直连就直连', body: '优先在两台设备之间直接连，连不上才走中继。' },
        ],
        specs: ['iPhone 控电脑、电脑控电脑', '只看 / 接管两档', '受保护窗口会遮住', '中继流量计入会员额度'],
        related: ['devices', 'tasks'],
      },
      {
        slug: 'devices',
        name: '多设备协同',
        short: '每台设备报上自己的能力，服务端按需派活。',
        eyebrow: '设备能力 · 派活 · 同步',
        title: '手机上说，\n电脑上做。',
        lead: `每台设备都告诉${B.productName}自己能做什么：截图、读写文件、操作电脑、写代码。你在哪台设备上开口都行，活会派给能做的那台。`,
        shot: 'devices',
        phone: '',
        chapters: [
          { title: '设备报能力', body: '电脑上线时把自己的能力报给服务端：文件、截图、电脑操控、编码代理（Claude Code、Codex、Cursor）。你在能力页能看到每台设备会什么。' },
          { title: '派给合适的那台', body: '你在手机上说「把电脑桌面那个表格整理一下」，任务就派到那台电脑上执行，进度回到手机。' },
          { title: '一台一把钥匙', body: '每台设备有自己的设备令牌，丢了哪台就吊销哪台，不影响别的设备。' },
          { title: '离线也能先用', body: '提醒、记账、灵感、保险箱、常用语这些本地功能，不登录、没网也能用，有网再同步。' },
        ],
        specs: ['电脑：macOS / Windows', '手机：iPhone（Android 移植中）', '设备令牌可单独吊销', '本地功能离线可用'],
        related: ['remote', 'launcher'],
      },
      {
        slug: 'launcher',
        name: '快捷入口与工作流',
        short: '⌥Space 一下：搜索、翻译、剪贴板、截图，再串成工作流。',
        eyebrow: '快捷入口 · 剪贴板 · 截图 · 工作流',
        title: '⌥Space，\n想做的事就在手边。',
        lead: '电脑上按一下快捷键，一个搜索框浮出来。打开应用、翻译、找剪贴板历史、截图贴图，都在这一个框里。',
        shot: 'launcher',
        phone: '',
        chapters: [
          { title: '一个框，什么都能找', body: '应用、文件、保险箱记录、常用语，打几个字就出来。翻译直接在框里给结果。' },
          { title: '剪贴板历史', body: '复制过的文字和图片都留着，随时翻回去。从保险箱复制的密码只放在内存里，20 秒后自动清掉，不写进磁盘。' },
          { title: '截图与贴图', body: '截完可以直接钉在屏幕上当参考，也可以丢给 AI 识图。' },
          { title: '工作流画布', body: '把常做的几步连成一条工作流：触发、处理、输出，在画布上拖出来，不用写代码。' },
        ],
        specs: ['默认快捷键 ⌥Space', '翻译内置', '剪贴板历史可搜索', '工作流可视化编辑'],
        related: ['vault', 'tasks'],
      },
    ],
  },

  download: {
    title: `下载${B.productName}`,
    lead: '在你的每一台设备上装上它。账号通用，数据在设备之间同步。',
    detected: '你正在用',
    pending: '内测中',
    pendingNote: '安装包暂未公开下载。想加入内测，请看页面底部的联系方式。',
    soon: '即将推出',
    requirementLabel: '系统要求',
    items: [
      { key: 'mac', name: 'macOS', req: 'macOS 12 及以上 · Apple 芯片', action: '下载 .dmg' },
      { key: 'win', name: 'Windows', req: 'Windows 10 及以上 · 64 位', action: '下载安装程序' },
      { key: 'ios', name: 'iPhone 与 iPad', req: 'iOS 16 及以上', action: '在 App Store 获取' },
      { key: 'android', name: 'Android', req: 'Android 移植中', action: '下载 APK' },
    ],
    studio: { title: '还想自己做设计？', body: `${B.studioName} 是跑在你电脑上的设计软件，稿子存在本地。`, link: `了解${B.studioName}` },
    contactTitle: '加入内测',
    contactBody: '内测名额有限。把你用的设备和想用它做什么发给我们：',
  },

  pricing: {
    title: '会员与积分',
    lead: '两种东西，各管一摊：会员管 AI 用多少，积分买插件和道具。',
    free: {
      name: '免费',
      price: '¥0',
      period: '一直免费',
      points: ['本地功能全部可用：提醒、记账、灵感、保险箱、常用语、快捷入口', '登录后多设备同步', '云端存储 {free}', '第一次用 AI 送 {trial} 天会员'],
    },
    member: {
      name: '会员',
      monthLabel: '按月',
      yearLabel: '按年',
      perMonth: '折合每月 {v}',
      save: '比按月省 {v}',
      points: ['AI 对话、任务、电脑操控、截图记账', 'AI 额度按 5 小时和每周两档计，用多少看百分比', '云端存储 {storage}', '买插件和道具 {discount}', '会员赠送的插件'],
    },
    note: '价格与额度以客户端「账号」页显示的为准，后台可能调整。iPhone 上暂不支持购买，请在电脑端开通。',
    credits: {
      title: '积分能买什么',
      items: [
        { name: '插件', body: `在${B.studioName} 的插件市场里买断，一次购买一直能用。` },
        { name: '额度重置卡', body: '额度用完了等不及重置，用一张马上回满。' },
        { name: '加量包', body: '这一周要多用一点，就加一点。' },
      ],
    },
    faqTitle: '常见问题',
    faq: [
      { q: '额度为什么只显示百分比？', a: '不同的事消耗不一样，一次长任务和一句闲聊差很多。百分比让你直接看到「还剩多少」，不用自己换算。' },
      { q: '会员到期会自动扣费吗？', a: '现在不会。自动续费还没有开通，到期后在账号页手动续费即可。以后开通时，付款页会写清楚，也能随时一键关掉。' },
      { q: '不开会员能用吗？', a: '能。提醒、记账、灵感、保险箱这些本地功能一直免费，不登录也能用。用到 AI 的部分才需要会员。' },
      { q: '怎么退款？', a: '见用户协议里的退款条款，或者通过帮助页的联系方式找我们。' },
    ],
  },

  studio: {
    eyebrow: B.studioName,
    title: '跑在你电脑上的\n设计软件。',
    lead: '创建和管理设计项目、编辑设计稿。最大的不同是：稿子存在你自己的电脑上。',
    shot: 'studio',
    shotAlt: `${B.studioName} 界面`,
    points: [
      { title: '一份文件三种身份', body: '设计稿就是 .dc.html：它同时是设计稿、规范出处和能直接运行的原型。' },
      { title: '三种改法', body: '手动选中元素改，选中后让 AI 改，或者直接和 AI 说你要什么。' },
      { title: '也是一个 MCP 服务', body: '同一套能力暴露成本地 MCP，Claude Code、Codex 这类工具可以直接连上来改稿。' },
      { title: '插件市场', body: 'Markdown、代码、网页预览随软件一起；更多编辑器在插件市场里装。' },
    ],
    cta: { href: '/download/', label: `下载${B.productName}` },
  },

  plugins: {
    title: '插件与主题',
    lead: `插件给${B.studioName} 加新的编辑器和工具；主题换掉${B.productName}三端的配色。在客户端的市场里安装或购买。`,
    pluginsTitle: '插件',
    themesTitle: '主题',
    builtin: '随软件附带',
    free: '免费',
    priceUnit: '积分',
    formats: '支持格式',
    by: '作者',
    snapshotNote: '这份清单是构建时从服务端取的，最新的以客户端市场为准。',
    snapshotFallback: '构建时没连上服务端，下面是内置的离线清单。',
    emptyThemes: '主题市场还没有上架的主题。第一批在做了，上架后会出现在这里。',
  },

  changelog: {
    title: '更新日志',
    lead: `${B.productName}最近做了什么。按日期倒序，同一天跨好几个端的改动合在一起写。`,
  },

  help: {
    title: '帮助',
    lead: '先看看这些常见问题；没找到答案就联系我们。',
    contactTitle: '联系我们',
    contactBody: '邮件里写上你用的设备和版本号，处理会快很多。',
    copy: '复制',
    copied: '已复制',
    groups: [
      {
        title: '开始使用',
        items: [
          { q: '一定要注册账号吗？', a: '不用。提醒、记账、灵感、保险箱、常用语、快捷入口都能单机用。需要 AI、多设备同步时再登录。' },
          { q: '电脑和手机怎么连起来？', a: '在两台设备上登录同一个账号就行。电脑上线后会自动把自己的能力报上去，手机上就能给它派活。' },
          { q: '支持哪些系统？', a: '电脑支持 macOS 和 Windows，手机支持 iPhone。Android 版在移植中。' },
        ],
      },
      {
        title: '数据与安全',
        items: [
          { q: '我的数据存在哪？', a: '登录后的同步数据存在中国内地的服务器上。保险箱只存密文。本地功能的数据只在你的设备上，除非你登录并同步。' },
          { q: '你们能看到我的保险箱吗？', a: '不能。保险箱在你的设备上用主密码和 Secret Key 加密，服务器只保存密文。' },
          { q: '忘了主密码怎么办？', a: '我们没法帮你找回，这是端到端加密的代价。请把 Secret Key 和应急信息抄在安全的地方。' },
          { q: '删掉的东西能找回吗？', a: '删掉的任务、提醒等先进回收站，保留 30 天，这期间随时能恢复。' },
        ],
      },
      {
        title: '会员与付款',
        items: [
          { q: '在 iPhone 上怎么开会员？', a: '目前 iPhone 上不支持购买。请在电脑端的「账号」页开通，开通后手机上同步生效。' },
          { q: '额度用完了怎么办？', a: '等到下一次重置，或者用积分买一张重置卡马上回满。' },
        ],
      },
    ],
  },

  about: {
    title: `关于${B.productName}`,
    lead: '停在你身边的私人 AI 助手。',
    // 名字的含义：sam 10-23 原稿「一段」版，按产品实际改写（不写本地运行、不上传、不推送）。
    // 正文里的「长尾雀」指真鸟（物种名），不是产品名，所以不走 brand 常量。
    body: [
      '长尾雀是一种真实存在的小鸟：只有麻雀大，尾巴却占了身长的一半，一年四季都停在同一片灌木丛里，不吵也不走。我们用它给这个产品起名，是因为它做的事和这只鸟很像。',
      '「长尾」是长尾需求：那些没有哪个大产品会专门做、却占了你生活一半的小事。「雀」是离人最近的鸟，但不聒噪：没变化它就安静，有结果才来找你。而它停在枝头守着，是我们最重要的承诺：到点的事，它自己醒来去做；你的东西，它替你看好：保险箱不登录也能用，在你的设备上加密，服务器上只有密文，我们也打不开。',
      `英文名 ${B.productNameEn}，que 是雀，tail 是尾巴，合起来还是那只长尾雀。熟了以后，叫它${B.nickname}就行。`,
      `${B.productName}由一个很小的团队开发，服务端、电脑端、手机端和 Studio 都是自己写的。我们在意两件事：你的数据只用来帮你做事，以及能在本机做完的事尽量不上云。`,
    ],
    photoAlt: '长尾雀（Carpodacus sibiricus）',
    photoPending: '长尾雀照片待授权',
    contactTitle: '联系方式',
  },

  legal: {
    draftBanner: '这是草案，尚未经过法务审核，正式上线前会更新。',
    updated: '更新于',
  },
};

export type Dict = typeof zh;
