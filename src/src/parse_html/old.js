import { consume,
  oldReddit, redditHTMLRequestOptions, ErrorCollector,
} from './common.js'
import {DOMParser} from 'linkedom/worker'
import TurndownService from 'turndown'
import { HTMLRewriter } from '@worker-tools/html-rewriter'

const turndownService = new TurndownService()
const domParser = new DOMParser()

const getMarkdownFromHTMLString = (string) => {
  // Must specify text/html. Without specifying, parser does not include links and messes up spacing
  return turndownService.turndown(domParser.parseFromString(string, 'text/html'))
}

turndownService.addRule('listItem', {
  filter: 'li',

  replacement: function (content, node, options) {
    content = content
      .replace(/^\n+/, '') // remove leading newlines
      .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
      .replace(/\n/gm, '\n    '); // indent
    var prefix = options.bulletListMarker + ' ';
    var parent = node.parentNode;
    if (parent.nodeName === 'OL') {
      var start = parent.getAttribute('start');
      var index = Array.prototype.indexOf.call(parent.children, node);
      prefix = (start ? Number(start) + index : index + 1) + '. ';
    }
    return (
      prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
    );
  }
});


class AttributeMapping {
  constructor(field, attribute, func) {
    this.field = field
    this.attribute = attribute
    this.func = func
  }
}
const stringJavascriptEpochSecondsToNumericEpoch = (n) => Number(n) / 1000
const attribute_mappings = [
  new AttributeMapping('name', 'data-fullname'),
  new AttributeMapping('subreddit', 'data-subreddit'),
  new AttributeMapping('author_fullname', 'data-author-fullname'),
  new AttributeMapping('author', 'data-author'),
  new AttributeMapping('permalink', 'data-permalink'),
  new AttributeMapping('subreddit_id', 'data-subreddit-fullname'),
  new AttributeMapping('created_utc', 'data-timestamp', stringJavascriptEpochSecondsToNumericEpoch),
  new AttributeMapping('url', 'data-url'),
  new AttributeMapping('domain', 'data-domain'),
  new AttributeMapping('num_comments', 'data-comments-count', Number),
  new AttributeMapping('num_crossposts', 'data-num-crossposts', Number),
  new AttributeMapping('score', 'data-score', Number),
]


const WWW_REDDIT_COM = 'https://www.reddit.com'
const leftSpaceBoundary = '(^|\\s)', rightSpaceBoundary = '($|\\s)'
const regexWithSpaceOnLeftAndRight = (middle) => new RegExp(leftSpaceBoundary+middle+rightSpaceBoundary)
const match_controversial = regexWithSpaceOnLeftAndRight('controversial')
const match_stickied = regexWithSpaceOnLeftAndRight('stickied')
const match_pinned = regexWithSpaceOnLeftAndRight('sticky-pinned')
const match_locked = regexWithSpaceOnLeftAndRight('locked')
const NAME_UNDEFINED = 'name_undefined', LAST_UNDEFINED = 'last_undefined', PERMALINK_UNDEFINED = 'permalink_undefined',
      SUBREDDIT_UNDEFINED = 'subreddit_undefined'
const COMMON_DEFAULTS = {
  removal_reason: null,
  quarantine: false,
  score: 1, // score is not present when hidden
  locked: false,
  distinguished: null,
  stickied: false,
}
const COMMENT_DEFAULTS = {
  ...COMMON_DEFAULTS,
}
const POST_DEFAULTS = {
  ...COMMON_DEFAULTS,
  link_flair_text: null,
  author_flair_text: null,
  pinned: false,
  removed_by_category: null,
}
// classes whose presence indicate the field should be true, and false for their absence
const BINARY_FIELD_TO_CLASS_REGEXES = {
  'locked': regexWithSpaceOnLeftAndRight('locked'), // only detects submission locks. comment locks will overwrite the value here
}

const fullnameIsComment = (name) => name.substr(0,2) === 't1'
const fullnameIsPost = (name) => name.substr(0,2) === 't3'

// keep track of items and quarantined subreddits appearing on user page HTML of old reddit
// based on solution from: https://stackoverflow.com/questions/68114819/access-nested-elements-in-htmlrewriter-cloudflare-workers
class Items extends ErrorCollector {
  constructor(url) {
    super(url)
    this.items = []
    this.ids_set = new Set()
    this.quarantined_subs = new Set()
    this.url = url
  }
  element(element) {
    const item = {}
    for (const att_map of attribute_mappings) {
      let value = element.getAttribute(att_map.attribute)
      if (value !== null) {
        if (att_map.func) {
          value = att_map.func(value)
        }
        item[att_map.field] = value
      }
    }
    const classes = element.getAttribute('class')
    for (const [field, regex] of Object.entries(BINARY_FIELD_TO_CLASS_REGEXES)) {
      item[field] = !! classes.match(regex)
    }
    if (item.name) {
      item.id = item.name.replace(/^t[0-9]_/, '')
      //comments
      if (fullnameIsComment(item.name)) {
        if (item.permalink) {
          const permalink_parts = item.permalink.split('/')
          item.link_id = 't3_'+permalink_parts[4]
          item.link_permalink = WWW_REDDIT_COM+permalink_parts.slice(0,6).join('/')+'/'
        } else {
          this.addError(PERMALINK_UNDEFINED)
        }
        item.stickied = !! classes.match(match_stickied)
        if (classes.match(match_controversial)) {
          item.controversiality = 1
        } else {
          item.controversiality = 0
        }
      } else { //submissions
        // submissions only get the class sticky-pinned, which indicates pinned (to user page).
        // user pages have no indicator in HTML for 'stickied' (as in, stickied to a subreddit) on submissions.
        // user/[user].json DOES indicate stickied-to-a-subreddit, it's just not marked in the HTML
        item.pinned = !! classes.match(match_pinned)
      }
    } else {
      this.addError(NAME_UNDEFINED)
    }
    this.items.push(item)
    this.ids_set.add(item.name)
  }
  addQuarantinedSub(sub) {
    this.quarantined_subs.add(sub)
  }
  fillInDefaultValues() {
    for (const item of this.items) {
      let defaults
      if (fullnameIsComment(item.name)) {
        defaults = COMMENT_DEFAULTS
      } else if (fullnameIsPost(item.name)) {
        defaults = POST_DEFAULTS
      }
      if (defaults) {
        for (const [field, value] of Object.entries(defaults)) {
          if (! (field in item)) {
            item[field] = value
          }
        }
      }
    }
  }
}
class ItemsMeta {
  constructor(itemsObj) {
    this.itemsObj = itemsObj
    this.items = itemsObj.items
    this.last = {}
  }
  // any extending class must call super.element(element) to define this.last
  element(element) {
    if (this.items.length) {
      const last = this.items[this.items.length - 1]
      if (! last) {
        this.itemsObj.addError(LAST_UNDEFINED)
      } else {
        this.last = last
      }
    }
  }
}
class OneField extends ItemsMeta {
  constructor(itemsObj, field_name, value) {
    super(itemsObj)
    this.field_name = field_name
    this.value = value
  }
  element(element, value = this.value) {
    super.element(element)
    this.last[this.field_name] = value
  }
}

class OneFieldAttribute extends OneField {
  constructor(itemsObj, field_name, att_name) {
    super(itemsObj, field_name)
    this.att_name = att_name
  }
  element(element, func = (v) => v) {
    super.element(element, func(element.getAttribute(this.att_name)))
  }
}

const fixDoubleSlashPrefix = (url) => {
  if (url.substr(0,2) === '//') {
    return 'https:'+url
  }
  return url
}

class Thumbnail extends OneFieldAttribute {
  constructor(itemsObj) {
    super(itemsObj, 'thumbnail', 'src')
  }
  element(element) {
    super.element(element, fixDoubleSlashPrefix)
  }
}

class IfClassesExistThenSetValue extends ItemsMeta {
  constructor(itemsObj, classToFieldMaps) {
    super(itemsObj)
    this.classToFieldMaps = classToFieldMaps
  }
  element(element) {
    super.element(element)
    const classes = element.getAttribute('class')
    for (const map of this.classToFieldMaps) {
      const regex = regexWithSpaceOnLeftAndRight(map.class_name)
      if (classes.match(regex)) {
        this.last[map.field_name] = map.value
      }
    }
  }
}

class ClassToFieldMap {
  constructor(class_name, field_name, value) {
    this.class_name = class_name, this.field_name = field_name, this.value = value
  }
}

// https://qwtel.com/posts/software/how-to-use-htmlrewriter-for-web-scraping/#extracting-html-subtrees
class InnerHTML extends ItemsMeta {
  constructor(itemsObj, field_name) {
    super(itemsObj)
    this.field_name = field_name
  }
  element(element) {
    super.element(element)
    if (! this.last[this.field_name]) {
      this.last[this.field_name] = ''
    }
    const attrs = [...element.attributes].map(([k, v]) => ` ${k}="${v}"`).join('');
    this.last[this.field_name] += `<${element.tagName}${attrs}>`
    // <br> tags can throw a "no end tag" error here.
    if (element.tagName !== 'br') {
      // If there are any other unclosed tags, it is better to ignore bad HTML w/try & catch than fail.
      try {
        element.onEndTag(endTag => {
          this.last[this.field_name] += `</${endTag.name}>`
        })
      } catch (error) {
        this.itemsObj.addError('NO_END_TAG_'+element.tagName)
      }
    }
  }
  text({text}) {
    this.last[this.field_name] += text
  }
}

class AuthorDeleted extends ItemsMeta {
  constructor(itemsObj) {
    super(itemsObj)
  }
  element(element) {
    super.element(element)
    this.last['author'] = '[deleted]'
  }
}

class ValueFromText extends ItemsMeta {
  constructor(itemsObj, field_name) {
    super(itemsObj)
    this.temp_text_var_name = field_name+'_text'
    this.field_name = field_name
  }
  element(element) {
    super.element(element)
    this.last[this.temp_text_var_name] = ''
  }
  text({text, lastInTextNode}, childFunc) {
    this.last[this.temp_text_var_name] += text
    if (lastInTextNode) {
      childFunc()
      delete this.last[this.temp_text_var_name]
    }
  }
}
const REGEX_BEGINS_WITH_SLASH = new RegExp(/^\//)
class LinkTitles extends ItemsMeta {
  element(element) {
    super.element(element)
    const last = this.last
    last.link_url = element.getAttribute('href')
    if (last.link_url.match(REGEX_BEGINS_WITH_SLASH)) {
      last.link_url = 'https://www.reddit.com'+last.link_url
    }
    last.link_title = ''
  }
  text({text}) {
    this.last.link_title += text
  }
}
const match_reddit = new RegExp(/^https?:\/\/([^.]+\.)?reddit\.com\//)
const match_domain_no_www = new RegExp(/https?:\/\/(?:www\.)?([^\/.]+\.[^\/]+)(\/.+)?/)
class PostTitle extends ValueFromText {
  constructor(itemsObj) {
    super(itemsObj, 'title')
  }
  element(element) {
    super.element(element)
    let href = element.getAttribute('href')
    if (href.match(REGEX_BEGINS_WITH_SLASH)) {
      href = WWW_REDDIT_COM + href
    }
    if (fullnameIsPost(this.last.name) && ! ('domain' in this.last)) {
      let domain = ''
      if (href.match(match_reddit)) {
        domain = 'self.'+this.last.subreddit
      } else {
        domain = href.replace(match_domain_no_www, '$1')
      }
      this.last.domain = domain
    }
    if (! ('url' in this.last)) {
      this.last.url = href
    }
  }
  text(props) {
    super.text(props, () => {
      this.last[this.field_name] = this.last[this.temp_text_var_name]
    })
  }
}

const user_fullname_match = new RegExp(/^id-t2_/)
const user_fullname_replace = new RegExp(/^id-/)
class LinkAuthor extends ItemsMeta {
  element(element) {
    super.element(element)
    this.last.link_author = ''
    const link_author_fullname = element.getAttribute('class')
                                 .replace(/ +/g, ' ').split(' ')
                                 .filter(x => x.match(user_fullname_match))[0]
    if (link_author_fullname) {
      this.last.link_author_fullname = link_author_fullname.replace(user_fullname_replace, '')
    }
  }
  text({text}) {
    this.last.link_author += text
  }
}
const FULL_COMMENTS_REGEX = new RegExp(/full comments \(([0-9]+)\)/)
class NumComments extends ValueFromText {
  text(props) {
    super.text(props, () => {
      const matches = this.last[this.temp_text_var_name].match(FULL_COMMENTS_REGEX)
      if (matches) {
        this.last[this.field_name] = Number(matches[1])
      }
    })
  }
}


class Score extends OneField {
  constructor(itemsObj) {
    super(itemsObj, 'score')
  }
  element(element) {
    super.element(element, Number(element.getAttribute('title')))
  }
}

const getEpochTimeFromDate = (dateString) => {
  return new Date(dateString).getTime()/1000
}

const match_created = regexWithSpaceOnLeftAndRight('live-timestamp')
const match_edited = regexWithSpaceOnLeftAndRight('edited-timestamp')

class Times extends ItemsMeta {
  element(element) {
    super.element(element)
    const classes = element.getAttribute('class')
    let field
    if (classes.match(match_created)) {
      field = 'created_utc'
    } else if (classes.match(match_edited)) {
      field = 'edited'
    }
    if (field) {
      const epoch_seconds = getEpochTimeFromDate(element.getAttribute('datetime'))
      if (epoch_seconds) {
        this.last[field] = epoch_seconds
      }
    }
  }
}

class Quarantined extends ItemsMeta {
  element(element) {
    super.element(element)
    const last_sub = this.last.subreddit
    if (last_sub) {
      this.itemsObj.addQuarantinedSub(last_sub)
    } else {
      this.itemsObj.addError(SUBREDDIT_UNDEFINED)
    }
    this.last.quarantine = true
  }
}

export const getItems_fromOld = async path => {
  const url = oldReddit + path

  const response = await fetch(url, redditHTMLRequestOptions)
  if (! response.ok) {
    return {error: 'request failed'}
  }
  const itemsObj = new Items(url)
  const rewriter = new HTMLRewriter()
  .on('#siteTable .thing', itemsObj)
  .on('#siteTable .thing .parent a.title', new LinkTitles(itemsObj))
  .on('#siteTable .thing .entry p.title a.title', new PostTitle(itemsObj))
  .on('#siteTable .thing .entry .usertext-body .md *', new InnerHTML(itemsObj, 'body'))
  .on('#siteTable .thing .entry .admin_takedown', new OneField(itemsObj, 'removal_reason', 'legal'))
  .on('#siteTable .thing .tagline .score.unvoted', new Score(itemsObj))
  .on('#siteTable .thing .tagline time', new Times(itemsObj))
  .on('#siteTable .thing .tagline .locked-tagline', new OneField(itemsObj, 'locked', true)) // for comments, sets locked=true
  .on('#siteTable .thing .tagline .author', new IfClassesExistThenSetValue(itemsObj, [
    new ClassToFieldMap('submitter', 'is_submitter', true),
    new ClassToFieldMap('moderator', 'distinguished', 'moderator'),
    new ClassToFieldMap('admin', 'distinguished', 'admin'),
  ]))
  .on('#siteTable .thing .parent .author', new LinkAuthor(itemsObj))
  .on('#siteTable .thing ul.buttons li.first a[data-event-action="full_comments"]', new NumComments(itemsObj, 'num_comments'))
  .on('#siteTable .thing .quarantine-stamp', new Quarantined(itemsObj))
  .on('#siteTable .thing .thumbnail img', new Thumbnail(itemsObj))
  await consume(rewriter.transform(response).body)
  const info_promise = getCommentsInfo_fromOld(Array.from(itemsObj.ids_set))
  itemsObj.fillInDefaultValues()
  itemsObj.printErrors()
  itemsObj.items.forEach(item => {
    item.body = getMarkdownFromHTMLString(item.body)
  })
  const info = await info_promise
  return {
    quarantined: Array.from(itemsObj.quarantined_subs),
    items: itemsObj.items,
    info,
    ids_set: itemsObj.ids_set,
  }
}

const getCommentsInfo_fromOld = async (ids) => {
  const url = oldReddit + '/api/info?id='+ids.join(',')
  const response = await fetch(url, {
    'Accept-Language': 'en',
    'Cookie': 'over18=1;',
    'User-Agent': 'extension',
    'credentials': 'omit',
  })
  if (! response.ok) {
    console.error('request failed:', url)
    return {}
  }
  const itemsObj = new Items(url)
  const rewriter = new HTMLRewriter()
  .on('#siteTable .comment', itemsObj)
  // .comment.deleted assumes the page contains no user-deleted comments.
  // That will be true as long as IDs given to this function come from user pages.
  // If user-deleted comments are present, must also check body==[removed]
  .on('#siteTable .comment.deleted', new AuthorDeleted(itemsObj))
  await consume(rewriter.transform(response).body)
  const info_items = itemsObj.items.reduce((obj, item) => {
    item.name = 't1_'+item.permalink.split('/').slice(6,7)
    obj[item.name] = item
    return obj
  }, {})
  return info_items
}