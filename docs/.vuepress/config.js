const moment = require('moment-timezone');

module.exports = {
  locales: {
    // 键名是该语言所属的子路径
    // 作为特例，默认语言可以使用 '/' 作为其路径。
    '/': {
      lang: 'zh-CN', // 将会被设置为 <html> 的 lang 属性
      title: 'Cellink 用户手册',
      description: '一款可视化代码流程管理框架',
    },
  },
  title: 'Cellink',
  base: '/cellink-docs/',
  head: [
    ['link', { rel: 'icon', href: '/imgs/icon.png' }],
    ['meta', { name: 'keywords', content: 'cellink,可视化,流程管理,cellink文档,用户文档'}]
  ],
  themeConfig: {
    locales: {
      '/': {
        // 多语言下拉菜单的标题
        selectText: 'Languages',
        // 该语言在下拉菜单中的标签
        label: '🇨🇳 简体中文',
        // 编辑链接文字
        editLinkText: '帮助我们完善文档',
        // 最后更新的描述
        lastUpdated: '文档更新于',
        // Service Worker 的配置
        serviceWorker: {
          updatePopup: {
            message: '发现新内容可用.',
            buttonText: '刷新',
          },
        },
        nav: [
          { text: '开始使用', link: '/start/' },
          { text: '配置指南', link: '/guide/' },
          { text: '进阶用法', link: '/advance/' },
		  { text: 'Cellink 实践', link: '/practice/' },
          { text: 'GitHub', link: 'https://github.com/viibridges/cellink' },
        ],
      },
    },
    sidebar: 'auto',
    // 假如你的文档仓库和项目本身不在一个仓库：
    docsRepo: 'zywvvd/cellink-docs',
    // 假如文档不是放在仓库的根目录下：
    docsDir: 'docs',
    // 假如文档放在一个特定的分支下：
    docsBranch: 'source',
    // 默认是 false, 设置为 true 来启用
    editLinks: true,
  },
  plugins: {
    '@vuepress/last-updated': {
      transformer: (timestamp, lang) => {
        if (lang === 'zh-CN') {
          return moment(timestamp).tz('Asia/Shanghai').locale(lang).format('lll')
        } else {
          return moment(timestamp).utc().locale(lang).format('lll')
        }
      },
    },
    'vuepress-plugin-clean-urls': {
      normalSuffix: '/',
      indexSuffix: '/',
      notFoundPath: '/404.html',
    },
    'sitemap': {
      hostname: 'https://zywvvd.github.io/',
      dateFormatter: time => new moment(time, 'lll').toISOString(),
    },
    'seo': {
      siteTitle: (_, $site) => $site.title,
      title: $page => $page.title,
      description: $page => $page.frontmatter.description,
      tags: $page => $page.frontmatter.tags,
      twitterCard: _ => '/favicon.png',
      type: $page => ['articles', 'posts', 'blog'].some(folder => $page.regularPath.startsWith('/' + folder)) ? 'article' : 'website',
      url: (_, $site, path) => 'https://zywvvd.github.io/' + path,
      image: ($page, $site) =>
        $page.frontmatter.image &&
        ($site.themeConfig.domain || '') + $page.frontmatter.image,
      publishedAt: $page =>
        $page.frontmatter.date && new Date($page.frontmatter.date),
      modifiedAt: $page => $page.lastUpdated && new Date($page.lastUpdated)
    },
    'vuepress-plugin-smooth-scroll': {},
    'vuepress-plugin-baidu-autopush':{},
  },
};
