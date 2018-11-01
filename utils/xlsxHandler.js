let Excel = require('exceljs');

let xlsxHandler = {

}

xlsxHandler.insertRows = async (data, filePath, city, headers) => {
  let workbook = new Excel.Workbook();
  let worksheet = {}
  
  try{
    await workbook.xlsx.readFile(filePath)
    worksheet = workbook.getWorksheet(city);
  }catch(err){
    workbook.addWorksheet(city);
    worksheet = workbook.getWorksheet(city);
    worksheet.addRow(headers);
    await workbook.xlsx.writeFile(filePath)
    await workbook.xlsx.readFile(filePath)
    worksheet = workbook.getWorksheet(city);
  }

  worksheet.addRows(data);

  await workbook.xlsx.writeFile(filePath)
}

module.exports = xlsxHandler