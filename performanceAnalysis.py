import pandas as pd
import numpy as np

# Fixed code ranges for categorizing data by entry code
PREMIUM_CODE = np.array([100, 500])
CLAIM_CODE = np.array([300, 600, 900])
COMMISSION_CODE = np.array([200])
CODE_HEADER = "Entry Code"


def premiumClaimCommissionTableConstruct(data):

    df = data.copy()
    
    # Prepare code column for numeric comparison
    df[CODE_HEADER] = df[CODE_HEADER].astype(str).str.strip()
    df[CODE_HEADER] = pd.to_numeric(df[CODE_HEADER], errors="coerce")
    
    # Initialize empty tables
    premiumTable = pd.DataFrame(columns=df.columns)
    claimTable = pd.DataFrame(columns=df.columns)
    commissionTable = pd.DataFrame(columns=df.columns)
    
    # Filter by code ranges
    for code in PREMIUM_CODE:
        filtered = df[(df[CODE_HEADER] >= code) & (df[CODE_HEADER] <= (code + 99))]
        premiumTable = pd.concat([premiumTable, filtered], ignore_index=True)
    
    for code in CLAIM_CODE:
        filtered = df[(df[CODE_HEADER] >= code) & (df[CODE_HEADER] <= (code + 99))]
        claimTable = pd.concat([claimTable, filtered], ignore_index=True)
    
    for code in COMMISSION_CODE:
        filtered = df[(df[CODE_HEADER] >= code) & (df[CODE_HEADER] <= (code + 99))]
        commissionTable = pd.concat([commissionTable, filtered], ignore_index=True)
    
    return {
        "premiumTable": premiumTable,
        "claimTable": claimTable,
        "commissionTable": commissionTable
    }


def performanceAnalysis(
    data,
    tableDict,
    category_header="Type of Business",
    data_field_header="Retained Amt Base",
    gross_data_field_header="Detail Amount (Base)",
    net_management_expense_ratio=0.12,
    filterArray=None,
):
    
    # DEBUG: Print received filters
    print(f"\n{'='*60}")
    print(f"DEBUG: performanceAnalysis() - Filters Received")
    print(f"{'='*60}")
    print(f"filterArray type: {type(filterArray)}")
    print(f"filterArray value: {filterArray}")
    if filterArray and len(filterArray) > 0:
        print(f"Number of filters: {len(filterArray)}")
        for i, filt in enumerate(filterArray):
            print(f"  Filter {i}: {filt} (type: {type(filt)})")
    else:
        print("No filters provided or empty filter list")
    print(f"{'='*60}\n")
    
    # Extract unique categories for analysis
    df = data.copy()
    filter_items = pd.unique(df[category_header].dropna())
    
    # Initialize result structure
    resultTableDictionary = {
        category_header: np.append(np.array(filter_items), "Total"),
        "Net Premium": np.array([]),
        "Net Incurred Claim": np.array([]),
        "Net Commission": np.array([]),
        "Net Technical Margin": np.array([]),
        "Loss Ratio": np.array([]),
        "Commission Ratio": np.array([]),
        "Net Management Expense Ratio": np.array([]),
        "Net Technical Margin Ratio": np.array([]),
        "Net Retro Expense Ratio": np.array([]),
        "Combined Ratio": np.array([])
    }
    
    grossPremiumSumArr = np.array([])
    
    # Get working copies of tables
    premiumTable = tableDict["premiumTable"].copy()
    claimTable = tableDict["claimTable"].copy()
    commissionTable = tableDict["commissionTable"].copy()
    
    def apply_filter(filterLabel, filterValue, operation="Equal"):
        """Apply filter condition to all three tables"""
        nonlocal premiumTable, claimTable, commissionTable
        
        
        if operation == "Equal":
            premiumTable = premiumTable[premiumTable[filterLabel] == filterValue]
            claimTable = claimTable[claimTable[filterLabel] == filterValue]
            commissionTable = commissionTable[commissionTable[filterLabel] == filterValue]
        elif operation == "Atlest":
            premiumTable = premiumTable[premiumTable[filterLabel] >= filterValue]
            claimTable = claimTable[claimTable[filterLabel] >= filterValue]
            commissionTable = commissionTable[commissionTable[filterLabel] >= filterValue]
        elif operation == "Atmost":
            premiumTable = premiumTable[premiumTable[filterLabel] <= filterValue]
            claimTable = claimTable[claimTable[filterLabel] <= filterValue]
            commissionTable = commissionTable[commissionTable[filterLabel] <= filterValue]
        
        # DEBUG: Print result after filter
        print(f"  After filter - premiumTable rows: {len(premiumTable)}, claimTable rows: {len(claimTable)}, commissionTable rows: {len(commissionTable)}")
    
    # Calculate metrics for each category
    for item in filter_items:
        # Reset tables for this iteration
        premiumTable = tableDict["premiumTable"].copy()
        claimTable = tableDict["claimTable"].copy()
        commissionTable = tableDict["commissionTable"].copy()
        
        # Apply category filter
        apply_filter(category_header, item)
        
        # Apply additional filters if provided
        if filterArray and len(filterArray) > 0:
            for filter_spec in filterArray:
                header = filter_spec[0]
                filterValue = filter_spec[1]
                operation = filter_spec[2]
                apply_filter(header, filterValue, operation)
        
        # Calculate sums
        premiumSum = np.sum(premiumTable[data_field_header]) if len(premiumTable) > 0 else 0
        grossPremiumSum = np.sum(premiumTable[gross_data_field_header]) if len(premiumTable) > 0 else 0
        claimSum = np.sum(claimTable[data_field_header]) if len(claimTable) > 0 else 0
        commissionSum = np.sum(commissionTable[data_field_header]) if len(commissionTable) > 0 else 0
        
        # Calculate ratios
        netTechnicalMargin = premiumSum + claimSum + commissionSum
        lossRatio = abs(claimSum / premiumSum) if premiumSum != 0 else 0
        commissionRatio = abs(commissionSum / premiumSum) if premiumSum != 0 else 0
        netTechnicalMarginRatio = abs(netTechnicalMargin / premiumSum) if premiumSum != 0 else 0
        netRetroExpenseRatio = 1 - (premiumSum / grossPremiumSum) if grossPremiumSum != 0 else 0
        combinedRatio = lossRatio + commissionRatio + net_management_expense_ratio + netRetroExpenseRatio
        
        # Append to result
        resultTableDictionary["Net Premium"] = np.append(resultTableDictionary["Net Premium"], premiumSum)
        resultTableDictionary["Net Incurred Claim"] = np.append(resultTableDictionary["Net Incurred Claim"], claimSum)
        resultTableDictionary["Net Commission"] = np.append(resultTableDictionary["Net Commission"], commissionSum)
        resultTableDictionary["Net Technical Margin"] = np.append(resultTableDictionary["Net Technical Margin"], netTechnicalMargin)
        resultTableDictionary["Loss Ratio"] = np.append(resultTableDictionary["Loss Ratio"], lossRatio)
        resultTableDictionary["Commission Ratio"] = np.append(resultTableDictionary["Commission Ratio"], commissionRatio)
        resultTableDictionary["Net Management Expense Ratio"] = np.append(resultTableDictionary["Net Management Expense Ratio"], net_management_expense_ratio)
        resultTableDictionary["Net Technical Margin Ratio"] = np.append(resultTableDictionary["Net Technical Margin Ratio"], netTechnicalMarginRatio)
        resultTableDictionary["Net Retro Expense Ratio"] = np.append(resultTableDictionary["Net Retro Expense Ratio"], netRetroExpenseRatio)
        resultTableDictionary["Combined Ratio"] = np.append(resultTableDictionary["Combined Ratio"], combinedRatio)
        grossPremiumSumArr = np.append(grossPremiumSumArr, grossPremiumSum)
    
    # Calculate totals row
    resultTableDictionary["Net Premium"] = np.append(resultTableDictionary["Net Premium"], np.sum(resultTableDictionary["Net Premium"]))
    resultTableDictionary["Net Incurred Claim"] = np.append(resultTableDictionary["Net Incurred Claim"], np.sum(resultTableDictionary["Net Incurred Claim"]))
    resultTableDictionary["Net Commission"] = np.append(resultTableDictionary["Net Commission"], np.sum(resultTableDictionary["Net Commission"]))
    resultTableDictionary["Net Technical Margin"] = np.append(resultTableDictionary["Net Technical Margin"], np.sum(resultTableDictionary["Net Technical Margin"]))
    
    resultTableDictionary["Loss Ratio"] = np.append(
        resultTableDictionary["Loss Ratio"],
        abs((resultTableDictionary["Net Incurred Claim"])[-1] / (resultTableDictionary["Net Premium"])[-1])
    )
    resultTableDictionary["Commission Ratio"] = np.append(
        resultTableDictionary["Commission Ratio"],
        abs((resultTableDictionary["Net Commission"])[-1] / (resultTableDictionary["Net Premium"])[-1])
    )
    resultTableDictionary["Net Management Expense Ratio"] = np.append(
        resultTableDictionary["Net Management Expense Ratio"],
        net_management_expense_ratio
    )
    resultTableDictionary["Net Technical Margin Ratio"] = np.append(
        resultTableDictionary["Net Technical Margin Ratio"],
        abs((resultTableDictionary["Net Technical Margin"])[-1] / (resultTableDictionary["Net Premium"])[-1])
    )
    resultTableDictionary["Net Retro Expense Ratio"] = np.append(
        resultTableDictionary["Net Retro Expense Ratio"],
        1 - abs((resultTableDictionary["Net Premium"])[-1] / np.sum(grossPremiumSumArr))
    )
    resultTableDictionary["Combined Ratio"] = np.append(
        resultTableDictionary["Combined Ratio"],
        resultTableDictionary["Loss Ratio"][-1] + 
        resultTableDictionary["Commission Ratio"][-1] +
        resultTableDictionary["Net Management Expense Ratio"][-1] + 
        resultTableDictionary["Net Retro Expense Ratio"][-1]
    )
    
    # Convert to DataFrame
    resultTable = pd.DataFrame(resultTableDictionary).reset_index(drop=True)
    resultTableForManipulation = resultTable.copy()
    
    # Format output columns
    ratio_columns = [
        "Loss Ratio",
        "Commission Ratio",
        "Net Management Expense Ratio",
        "Net Technical Margin Ratio",
        "Net Retro Expense Ratio",
        "Combined Ratio"
    ]
    
    currency_columns = [
        "Net Premium",
        "Net Incurred Claim",
        "Net Commission",
        "Net Technical Margin"
    ]
    
    # Apply currency formatting (negative in parentheses)
    resultTable[currency_columns] = resultTable[currency_columns].map(
        lambda x: f"({abs(x):,.2f})" if x < 0 else f"{x:,.2f}"
    )
    
    # Apply percentage formatting
    resultTable[ratio_columns] = resultTable[ratio_columns].map(lambda x: f"{x:.2%}")
    
    return (resultTable, resultTableForManipulation)