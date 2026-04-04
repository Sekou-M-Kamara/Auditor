import pandas as pd
import xlsxwriter as xl
import io
import re
import inspect
from xlsxwriter.utility import xl_col_to_name
from performanceAnalysis import performanceAnalysis



def excelSheetsGenerator(analysisType,
                         categoryBundle,
                         oneSheet=True,
                         data=pd.DataFrame(),
                         tableDict=None,
                         category_header="Type of Business",
                         data_field_header="Retained Amt Base",
                         gross_data_field_header="Detail Amount (Base)",
                         net_management_expense_ratio=0.12,
                         filterArray=None,
                         thresholds=None):

    if tableDict is None:
        tableDict = {}
    if filterArray is None:
        filterArray = []
    if categoryBundle is None:
        categoryBundle = []
    if thresholds is None:
        thresholds = {}

    output = io.BytesIO()
    workBook = xl.Workbook(output, {'in_memory': True})
    number_fmt = workBook.add_format({'num_format': '#,##0.00;(#,##0.00)'})
    ratio_fmt = workBook.add_format({'num_format': '0.00%;(0.00%)'})
    threshold_alert_fmt = workBook.add_format({'bg_color': '#F8D7DA', 'font_color': '#842029'})

    def excelFormatter(ws, wsRC=None, table_columns=None):

        if wsRC is None:
            wsRC = []

        if analysisType == "performance":

            if not wsRC:
                number_fmt = workBook.add_format({'num_format': '#,##0.00;(#,##0.00)'})
                ratio_fmt = workBook.add_format({'num_format': '0.00%;(0.00%)'})

                excelNumberColumnIndex = range(3, 7)
                excelRatioColumnIndex = range(7, 13)
                valueWidth = 17
                headerContentsWidth = 25

                for index in excelNumberColumnIndex:
                    ws.set_column((index - 1), (index - 1), valueWidth, number_fmt)
                for index in excelRatioColumnIndex:
                    ws.set_column((index - 1), (index - 1), headerContentsWidth, ratio_fmt)
            else:
                ratio_columns = [
                "Loss Ratio",
                "Commission Ratio",
                "Net Management Expense Ratio",
                "Net Technical Margin Ratio",
                "Net Retro Expense Ratio",
                "Combined Ratio"
                ]

                ratio_column_lookup = {}
                if table_columns:
                    for offset, column_name in enumerate(table_columns):
                        ratio_column_lookup[column_name] = wsRC[2] + offset

                for col_offset, col_name in enumerate(ratio_columns):
                    threshold_config = thresholds.get(col_name)
                    if not isinstance(threshold_config, dict):
                        continue

                    condition_name = str(threshold_config.get('condition', '')).lower()
                    raw_value = threshold_config.get('value', None)
                    try:
                        threshold_value = float(raw_value)
                    except (TypeError, ValueError):
                        continue

                    if condition_name == 'atleast':
                        criteria = '>='
                    elif condition_name == 'atmost':
                        criteria = '<='
                    elif condition_name == 'equal':
                        criteria = '=='
                    else:
                        continue

                    ratio_col_index = ratio_column_lookup.get(col_name, 6 + col_offset)
                    if ratio_col_index < wsRC[2] or ratio_col_index > wsRC[3]:
                        continue

                    ws.conditional_format(
                        wsRC[0],
                        ratio_col_index,
                        wsRC[1],
                        ratio_col_index,
                        {
                            'type': 'cell',
                            'criteria': criteria,
                            'value': threshold_value,
                            'format': threshold_alert_fmt
                        }
                    )
            

    previousTableLength = 0

    def addTable(ws, table, category=None):
        nonlocal previousTableLength

        verticalDis = 2
        
        tableList = table.values.tolist()
        columns = [{"header": col} for col in table.columns.tolist()]

        num_rows = len(table)
        num_cols = len(table.columns)

        start_row = previousTableLength + verticalDis
        start_col = 1

        end_row = start_row + num_rows
        end_col = start_col + num_cols - 1

        start_col_letter = xl_col_to_name(start_col)
        end_col_letter = xl_col_to_name(end_col)

        
        table_range = f"{start_col_letter}{start_row}:{end_col_letter}{end_row}"
        if oneSheet:
            ws.write(f"{start_col_letter}{start_row-1}", str(category))
            previousTableLength = end_row

        ws.add_table(table_range, {
            "data": tableList,
            "columns": columns
        })

        excelFormatter(ws, [start_row, end_row - 1, start_col, end_col], table.columns.tolist())

    def build_result_table(category_header_name):
        kwargs = {
            "data": data,
            "tableDict": tableDict,
            "category_header": category_header_name,
            "data_field_header": data_field_header,
            "gross_data_field_header": gross_data_field_header,
            "net_management_expense_ratio": net_management_expense_ratio,
            "filterArray": filterArray
        }

        # Backward-compatible: only pass excelOn if the loaded function supports it.
        if "excelOn" in inspect.signature(performanceAnalysis).parameters:
            kwargs["excelOn"] = True

        return performanceAnalysis(**kwargs)

    if oneSheet:
        workSheet = workBook.add_worksheet(str(analysisType)[:31] or "Analysis")
        excelFormatter(workSheet)
        for category_header_name in categoryBundle:
            resultTable = build_result_table(category_header_name)
            addTable(workSheet, resultTable, category_header_name)
    else:
        used_sheet_names = set()

        def unique_sheet_name(base_name):
            clean_name = str(base_name).strip()
            clean_name = re.sub(r"[\[\]:*?/\\]", "_", clean_name)
            clean_name = clean_name.strip("'")
            clean_name = clean_name[:31] or "Sheet"
            if clean_name not in used_sheet_names:
                used_sheet_names.add(clean_name)
                return clean_name

            suffix = 1
            while True:
                suffix_token = f"_{suffix}"
                max_base_length = 31 - len(suffix_token)
                candidate = f"{clean_name[:max_base_length]}{suffix_token}"
                if candidate not in used_sheet_names:
                    used_sheet_names.add(candidate)
                    return candidate
                suffix += 1

        for category_header_name in categoryBundle:
            workSheet = workBook.add_worksheet(unique_sheet_name(category_header_name))
            excelFormatter(workSheet)
            resultTable = build_result_table(category_header_name)
            addTable(workSheet, resultTable)

    workBook.close()
    output.seek(0)
    return output

