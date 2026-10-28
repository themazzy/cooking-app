// One-off: asks albert.cz's GraphQL API for a recipe's steps.
import { mkdirSync, writeFileSync } from 'node:fs'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
mkdirSync('probe', { recursive: true })
const query = 'query getRecipe($code:String!$lang:String!){getRecipe(code:$code lang:$lang){id title servings preparationTime preparationTimeName cookingTimeDescription recipeCookingSteps{description stepNumber} cookingTips{code type title description} execution description}}'
const out = []
for (const code of ['R00000806', 'a10989', 'A10989', 'a2528']) {
  for (const [name, init] of [
    ['post', { method: 'POST', headers: { 'User-Agent': UA, 'content-type': 'application/json', 'x-apollo-operation-name': 'getRecipe', 'apollographql-client-name': 'cz-alb-web-stores' }, body: JSON.stringify({ operationName: 'getRecipe', query, variables: { code, lang: 'cs' } }) }],
    ['get', { headers: { 'User-Agent': UA, 'apollo-require-preflight': 'true', 'x-apollo-operation-name': 'getRecipe' } }],
  ]) {
    const url = name === 'get' ? 'https://www.albert.cz/api/v1/?' + new URLSearchParams({ operationName: 'getRecipe', query, variables: JSON.stringify({ code, lang: 'cs' }) }) : 'https://www.albert.cz/api/v1/'
    try {
      const r = await fetch(url, init)
      out.push(`### ${code} ${name} ${r.status} ${r.headers.get('content-type')}\n${(await r.text()).slice(0, 15000)}`)
    } catch (e) { out.push(`### ${code} ${name} ERR ${e.message}`) }
  }
}
writeFileSync('probe/gql.txt', out.join('\n\n'))
