import { Drawer, type DrawerProps } from 'antd'

// Every sheet keeps its title on the left and dismissal on the right.
export function AppDrawer({ closable = true, ...props }: DrawerProps) {
  return <Drawer {...props} closable={closable === false ? false : { ...(typeof closable === 'object' ? closable : {}), placement: 'end' }} />
}
