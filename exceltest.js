const xlsxHandler = require('./utils/xlsxHandler')

async function work () {
  await xlsxHandler.insertRows([
    [
      '1',
      '2'
    ],
    [
      '3',
      '4'
    ]
  ], './excels/' + 'Chicago.xlsx', 'Chicago', ['name'])
}

work()
