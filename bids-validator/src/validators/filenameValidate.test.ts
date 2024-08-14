import { FileTree } from '../types/filetree.ts'
import { GenericSchema } from '../types/schema.ts'
import { assertEquals } from '../deps/asserts.ts'
import { BIDSContext } from '../schema/context.ts'
import { atRoot, entityLabelCheck, missingLabel } from './filenameValidate.ts'
import { BIDSFileDeno } from '../files/deno.ts'
import { FileIgnoreRules } from '../files/ignore.ts'
import { loadSchema } from '../setup/loadSchema.ts'

const schema = (await loadSchema()) as unknown as GenericSchema
const nullFile = {
  size: 0,
  ignored: false,
  parent: new FileTree('/', '/'),
  viewed: false,
  stream: new ReadableStream(),
  text: async () => '',
  readBytes: async (size: number, offset?: number) => new Uint8Array(),
}

function newContext(path: string): BIDSContext {
  return new BIDSContext({
    name: path.split('/').pop() as string,
    path: path,
    ...nullFile,
  })
}

Deno.test('test missingLabel', async (t) => {
  await t.step('File with underscore and no hyphens errors out.', async () => {
    const context = newContext(`/no_label_entities.wav`)
    // Need some suffix rule to trigger the check,
    // otherwise this is trigger-happy.
    context.filenameRules = ['rules.files.raw.dwi.dwi']

    await missingLabel(schema, context)
    assertEquals(
      context.dataset.issues
        .get({
          location: context.file.path,
          code: 'ENTITY_WITH_NO_LABEL',
        }).length,
      1,
    )
  })

  await t.step(
    "File with underscores and hyphens doesn't error out.",
    async () => {
      const context = newContext('/we-do_have-some_entities.wav')
      // Doesn't really matter that the rule doesn't apply
      context.filenameRules = ['rules.files.raw.dwi.dwi']

      await missingLabel(schema, context)
      assertEquals(
        context.dataset.issues.get({
          location: context.file.path,
          code: 'ENTITY_WITH_NO_LABEL',
        }).length,
        0,
      )
    },
  )
})
