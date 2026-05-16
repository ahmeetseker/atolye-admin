import { ImportWizard } from '@/components/import/ImportWizard'

/**
 * Wave F18.C — `/listings/import` route. Mounts the entity-agnostic
 * ImportWizard pinned to the `listing` schema.
 */
export function ListingsImport() {
  return <ImportWizard entity="listing" />
}
