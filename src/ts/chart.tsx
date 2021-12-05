import { ChartOptions } from 'chart.js'
import { FC, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { ChartData } from './types'


export type MonitoringChartProps = {
  data: ChartData
}

export const MonitoringChart: FC<MonitoringChartProps> = (props: MonitoringChartProps): JSX.Element => {
  const data = useMemo(() => {
    return {
      labels: props.data.labels,
      datasets: props.data.datasets.map(e => {
        e.fill = false
        e.tension = 0.3
        e.pointStyle = 'line'
        if (!e.borderColor) {
          e.borderColor = 'rgb(75, 192, 192)'
        }
        return e
      })
    }
  }, [props.data.labels, props.data.datasets])

  const options = useMemo((): ChartOptions<'line'> => {
    return {
      animation: false,
      scales: {
        y: {
          title: {
            display: true,
            text: props.data.unit,
          },
          stacked: !!props.data.stacked,
        }
      },
    }
  }, [props.data.unit, props.data.stacked])

  return (
    <div>
      <Line data={data} options={options}/>
    </div>
  )
}