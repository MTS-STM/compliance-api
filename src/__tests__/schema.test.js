global.fetch = require('jest-fetch-mock')
const fs = require('fs')
const { graphql } = require('graphql')
const { schema } = require('../schema')
const { getChecks } = require('../getChecks.js')
const { fetchYaml } = require('../fetchYaml.js')
const { createCompliance } = require('../createCompliance.js')

fetch.mockResponses(
  [
    `
name: nano
standards:
  ITSG-33a:
    AU-6: {}
    SA-11 (1): {}
`,
    { status: 200 },
  ],
  [
    fs.readFileSync('src/__tests__/testData/definitions/ITSG-33a.yaml'),
    { status: 200 },
  ],
)

let checks, certification, definitions

describe('GraphQL Schema', () => {
  beforeAll(async () => {
    // real fixture path
    checks = await getChecks('src/__tests__/testData/checks')
    // fake but valid url, response is just from the mock
    // first call gets the first mock with the certification
    certification = await fetchYaml('https://example.com/foo.yaml')

    // second call gets second mock with the full definitions
    definitions = await fetchYaml('https://example.com/ITSG-33a.yaml')
  })

  describe('Query type', () => {
    it('has a controls field defined', () => {
      let Query = schema.getType('Query')
      let fields = Query.getFields()
      expect(fields).toHaveProperty('controls')
    })
  })

  describe('controls', () => {
    it('returns a list of all known controls', async () => {
      let compliancePosture = await createCompliance({
        definitions,
        checks,
        certification,
      })

      let query = `
    {
      controls {
        id
        name
        family
        verifications {
          origin
          passed
        }
      }
    }
    `

      let result = await graphql(schema, query, compliancePosture)
      expect(result).not.toHaveProperty('errors')
      let [au6] = result.data.controls

      expect(au6).toEqual({
        family: 'AU',
        id: 'AU-6',
        name: 'Audit Review, Analysis, And Reporting',
        verifications: [],
      })
    })
  })

  describe('verifiedControls', () => {
    it('returns the list of controls with checks that pass', async () => {
      let compliancePosture = await createCompliance({
        definitions,
        checks,
        certification,
      })

      let query = `
        {
          verifiedControls {
            id
            name
            family
            verifications {
              origin
              passed
            }
          }
        }
      `

      let result = await graphql(schema, query, compliancePosture)
      expect(result).not.toHaveProperty('errors')
      let { verifiedControls } = result.data
      expect(verifiedControls).toEqual([
        {
          family: 'SA',
          id: 'SA-11 (1)',
          name: 'Developer Security Testing',
          verifications: [
            {
              origin: 'sa_11_1:latest',
              passed: 'true',
            },
          ],
        },
      ])
    })
  })
})
