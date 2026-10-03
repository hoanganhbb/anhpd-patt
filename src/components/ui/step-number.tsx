import { Flex } from '@chakra-ui/react'

// Numbered step badge, used as the panel icon.
export function StepNumber({ n }: { n: number }) {
  return (
    <Flex
      boxSize="26px"
      borderRadius="full"
      align="center"
      justify="center"
      fontSize="13px"
      fontWeight="bold"
      color="brand.contrast"
      bg="brand.solid"
    >
      {n}
    </Flex>
  )
}
