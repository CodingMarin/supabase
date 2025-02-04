import WarehouseAccessTokens from 'components/interfaces/DataWarehouse/WarehouseAccessTokens'
import LogsLayout from 'components/layouts/LogsLayout/LogsLayout'
import { NextPageWithLayout } from 'types'

const PageLayout: NextPageWithLayout = () => <WarehouseAccessTokens />

PageLayout.getLayout = (page) => <LogsLayout>{page}</LogsLayout>

export default PageLayout
