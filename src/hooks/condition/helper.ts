export const getCurrentPageNoFromPath: ({
  pageName,
  path,
}: {
  pageName: string
  path: string
}) => number = ({ path, pageName }) => {
  const pathAsArray = path.split('.')
  const pageIndexFromPathArray = pathAsArray.indexOf(pageName) + 1

  return Number(pathAsArray[pageIndexFromPathArray])
}
