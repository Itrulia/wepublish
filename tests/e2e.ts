import { ClientFunction, Role, Selector } from "testcafe";
import {slugify} from '../config/utilities'
import * as process from "process";

const loginName = Selector('input').withAttribute('autocomplete','username')
const loginPassword = Selector('input').withAttribute('autocomplete','currentPassword')
const createArticle = Selector('a').withAttribute('href', '/article/create')
const metadataButton = Selector('button').child('i.rs-icon-newspaper-o')
const createButton = Selector('button').child('i.rs-icon-save')
const publishButton = Selector('button').child('i.rs-icon-cloud-upload')

const closeButton = Selector('.rs-drawer-footer').child('button.rs-btn-primary')
const confirmButton = Selector('.rs-modal-footer').child('button.rs-btn-primary')
const metaPreTitleInput = Selector('input.preTitle')
const metaTitleInput = Selector('input.title')
const metaLeadInput = Selector('textarea.lead')

const articleTitleInput = Selector('textarea').withAttribute('placeholder', 'Title')
const articleLeadInput = Selector('textarea').withAttribute('placeholder', 'Lead Text ')


const EDITOR_URL = process.env.BRANCH_NAME ? `https://editor.${slugify(process.env.BRANCH_NAME)}.wepublish.dev` : process.env.E2E_TEST_EDITOR_URL
const WEBSITE_URL = process.env.BRANCH_NAME ? `https://www.${slugify(process.env.BRANCH_NAME)}.wepublish.dev` : process.env.E2E_TEST_WEBSITE_URL

console.log('Editor_URL', EDITOR_URL)
console.log('Editor_URL', WEBSITE_URL)

function makeid(length) {
  let result           = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const admin = Role(`${EDITOR_URL}/login`, async t => {
  await t
    .typeText(loginName, 'dev@wepublish.ch')
    .typeText(loginPassword, '123')
    .click('form > button')
});

const getPath = ClientFunction(() => {
  return document.location.pathname
});

const goToPath = ClientFunction((websiteUrl, articleID,articleTitle) => {
  document.location.href = `${websiteUrl}/a/${articleID}/${articleTitle}`
});

fixture `Create and publish an article`
  .disablePageCaching
  .beforeEach(async t => {
    await t.useRole(admin)

  })
  .page(`${EDITOR_URL}`)


let articleID = ''
const articleTitle = makeid(15)

test('Create an article', async t => {
  await t
    .click(createArticle)

  await t
    .expect(await getPath()).contains('/article/create')

  await t
    .typeText(articleTitleInput, 'This is the article Title')
    .typeText(articleLeadInput, 'This is the article lead')
    .click(createButton);

  const path = await getPath()
  articleID = path.substr(path.lastIndexOf('/') + 1)
  await t.expect(path).contains('/article/edit')

  await t
    .click(metadataButton)
    .expect(metaTitleInput.value).contains('This is the article Title')
    .expect(metaLeadInput.value).contains('This is the article lead')
    .typeText(metaPreTitleInput, 'This is a Pre-title')
    .click(closeButton)

  /* await t
    .click(lastAddButton)
    .click(richTextButton)
    .typeText(richTextBox, 'This is some random text') */


});

test
  .page(`${WEBSITE_URL}`)
  ('Test Website', async t => {
    await goToPath(WEBSITE_URL, articleID, articleTitle)
    await t.expect(Selector('h1').innerText).eql('404')
  })

test('Publish article', async t => {
  await t
    .click(Selector('a').withAttribute('href',`/article/edit/${articleID}`))
    .click(publishButton)
    .click(confirmButton)
    .expect(Selector('div.rs-alert-container').exists).ok()
    .click(Selector('div.rs-alert-item-close'))

  await t
    .click(metadataButton)
    .click(Selector('button').child('i.rs-icon-magic'))
    .click(closeButton)
    .click(publishButton)
    .click(confirmButton)
    .expect(Selector('div.rs-tag-default').child('span.rs-tag-text').innerText).contains('Article published')
})

test
  .page(`${WEBSITE_URL}`)
  ('Test Website', async t => {
    const h1Title = Selector('h1')
    await goToPath(WEBSITE_URL, articleID, articleTitle)

    await t
      .expect(h1Title.innerText).eql('This is the article Title')
  })

/* test('Delete article', async t => {
  const articleBox = Selector('a').withAttribute('href', `/article/edit/${articleID}`).parent(1)
  await t
    .click(articleBox.child('div').nth(1).child('div').nth(4).child('button'))
    .click(deleteButton)
    .click(confirmButton)
    .expect(articleBox.exists).notOk()
}) */