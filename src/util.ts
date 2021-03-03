export const removeNullFields = (obj: any) => Object.keys(obj)
  .filter((key) => obj[key] != null)
  .reduce(
    (acc, key) => {
      acc[key] = obj[key]
      return acc
    },
    {},
  )
