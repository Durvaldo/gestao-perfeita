// Setup único do ECharts: vue-echarts exige registrar explicitamente os módulos
// usados (tree-shaking). Cada view importa o VChart já configurado daqui.
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

export default VChart
