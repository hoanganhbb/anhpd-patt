import { Box, Card, Flex, HStack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface HeaderProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  // Rendered on the right: buttons, badges, menus.
  actions?: ReactNode
}

// Standard card header: brand icon + title (+ description) + actions on the right.
export function PanelHeader({ icon, title, description, actions }: HeaderProps) {
  return (
    <Card.Header flexDirection="row" alignItems="center" gap="2.5" flexWrap="wrap">
      {icon && (
        <Flex color="brand.fg" fontSize="20px" flexShrink={0}>
          {icon}
        </Flex>
      )}
      <Box minWidth="0">
        <Card.Title textStyle="md">{title}</Card.Title>
        {description && (
          <Text textStyle="xs" color="fg.muted">
            {description}
          </Text>
        )}
      </Box>
      {actions && (
        <HStack ms="auto" gap="2" wrap="wrap">
          {actions}
        </HStack>
      )}
    </Card.Header>
  )
}

interface Props extends HeaderProps, Omit<Card.RootProps, 'title'> {
  children?: ReactNode
  // e.g. { p: 0 } for a table that should touch the card edges.
  bodyProps?: Card.BodyProps
}

// The building block for every content section: <Panel icon title actions>…</Panel>.
export function Panel({
  icon,
  title,
  description,
  actions,
  bodyProps,
  children,
  ...rest
}: Partial<Props>) {
  return (
    <Card.Root variant="outline" {...rest}>
      {title && (
        <PanelHeader icon={icon} title={title} description={description} actions={actions} />
      )}
      <Card.Body pt={title ? '3' : undefined} {...bodyProps}>
        {children}
      </Card.Body>
    </Card.Root>
  )
}
