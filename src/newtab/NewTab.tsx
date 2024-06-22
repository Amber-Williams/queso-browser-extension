import { Background, Core, Theme } from '@mb3r/component-library'
import { useEffect, useState } from 'react'

export const NewTab = () => {
  const getTime = () => {
    const date = new Date()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  }

  const [time, setTime] = useState(getTime())

  useEffect(() => {
    let intervalId = setInterval(() => {
      setTime(getTime())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <Theme.Provider mode={'dark'}>
      <>
        <Core.CssBaseline />

        <div
          style={{
            height: '100%',
            minHeight: '100vh',
            width: '100vw',
            position: 'absolute',
            backgroundColor: '#0f1011',
            zIndex: 0,
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <main>
            <Core.Typography
              variant="h1"
              component="h1"
              align="center"
              sx={{
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.2rem',
                mt: '25%',
              }}
            >
              {time}
            </Core.Typography>
          </main>
        </div>
      </>
    </Theme.Provider>
  )
}

export default NewTab
