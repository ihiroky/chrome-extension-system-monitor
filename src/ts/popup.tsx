import { ChangeEvent, StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { MonitoringChart } from './chart'
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from 'chart.js'
import { ChartData, KindChange, KindRequest, Resource, ResourceName, ResourceNames } from './types'
import { Resources } from './linux' // TODO smart way to update Resources.from()

function isResourceName(s: any): s is ResourceName {
  return ResourceNames.includes(s)
}

const Popup = () => {
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] })
  const [resourceName, setResourceName] = useState<ResourceName>(ResourceNames[0])
  const [kind, setKind] = useState<string>('')
  const [kindMaster, setKindMaster] = useState<Record<ResourceName, string[]>>({
    CPU: [],
    Memory: [],
    Storage: [],
    Network: [],
  })

  useEffect((): (() => void) => {
    const kindRequest: KindRequest = {
      type: 'kind_request'
    }
    chrome.runtime.sendMessage(kindRequest)

    const listener = (data: Resource | KindChange): void => {
      if ('newKinds' in data) {
        setKindMaster((master: Record<ResourceName, string[]>): Record<ResourceName, string[]> => {
          if (data.name === resourceName && master[data.name].length === 0) {
            const first = data.newKinds[0]
            if (first) {
              setKind(first)
            }
          }
          master[data.name] = data.newKinds
          return master
        })
        return
      }

      const resource = Resources.from(data)
      if (resource && resource.name === resourceName && kind) {
        const chartData = resource.toData(kind)
        setChartData(chartData)
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    return (): void => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [kind, resourceName])

  const onResourceChanged = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    if (isResourceName(e.target.value)) {
      setResourceName(e.target.value)
      const kind = kindMaster[e.target.value][0]
      if (kind) {
        setKind(kind)
      }
    }
  }, [kindMaster])

  const onKindChanged = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setKind(e.target.value)
  }, [])

  return (
    <>
      <ul style={{ minWidth: '700px' }}>
        <li>Current Time: {new Date().toLocaleTimeString()}</li>
      </ul>
      <div>
        {ResourceNames.map(rn => (
          <span key={rn}>
            <input type="radio" name="resource" value={rn} checked={rn === resourceName} onChange={onResourceChanged} />
            {rn}
          </span>
        ))}
      </div>
      <div>
        {kindMaster[resourceName].map(knd => (
          <span key={`${resourceName}-${knd}`}>
            <input type="radio" name="kind" value={knd} checked={knd === kind} onChange={onKindChanged} />
            {knd}
          </span>
        ))}
      </div>
      <MonitoringChart data={chartData} />
    </>
  )
}

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

ReactDOM.render(
  <StrictMode>
    <Popup />
  </StrictMode>,
  document.getElementById('root')
);
