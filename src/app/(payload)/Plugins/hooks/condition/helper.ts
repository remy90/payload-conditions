/**
 * Returns the index _before_ the indexRef in the path
 */
export const getIndexFromPath: ({
  path,
  indexRef,
}: {
  path: string
  indexRef: string
}) => number = ({ path, indexRef }) => {
  const pathAsArray = path.split('.')
  // search for indexRef in pathAsArray
  const pageIndexFromPathArray = pathAsArray.findIndex(pathPart => pathPart === indexRef)
  if (pageIndexFromPathArray === -1) throw new Error('indexRef not found in path')

  return Number(pathAsArray[pageIndexFromPathArray - 1])
}
