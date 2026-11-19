import { AryDevTools } from 'tinyary/arykit'
import { Button, Display } from './ary-counter'

export default function AryKitPage() {
  return (
    <main>
      <h1>AryKit</h1>
      <p>
        Dos islas comparten un átomo de módulo. El contador vive en{' '}
        <code>tinyary/arykit</code>; el servidor sólo manda el HTML inicial.
      </p>
      <Display />
      <Button />
      <AryDevTools />
    </main>
  )
}
