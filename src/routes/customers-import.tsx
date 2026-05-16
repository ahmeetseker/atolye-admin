import { ImportWizard } from '@/components/import/ImportWizard'

/**
 * Wave F18.C — `/customers/import` route. Mounts the entity-agnostic
 * ImportWizard pinned to the `customer` schema.
 */
export function CustomersImport() {
  return <ImportWizard entity="customer" />
}
