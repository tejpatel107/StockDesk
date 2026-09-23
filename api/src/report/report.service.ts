import type { Request } from "express";
import type { ParsedQs } from "qs";


export async function getLowStockService(req: Request) {

    const { threshold } = req.query;

    try {
        const categories = await getProductsAtOrBelowStockLevelDb(threshold);
        return {
            statusCode: 200,
            data: { count: categories.length, categories }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}



function getProductsAtOrBelowStockLevelDb(threshold: string | ParsedQs | (string | ParsedQs)[] | undefined) {
    throw new Error("Function not implemented.");
}
/*  Function MakeInsertQuery(Array_FieldsData,tableName){
    Array_FieldsData =[
        {   "field_name":"UserName",
            "field_value":"nikunj"
        },
        {   "field_name":"Email",
            "field_value":"nikunj@gmail.com"
        },
        {   "field_name":"password",
            "field_value":"nikunj@gmail.com"
        }
    ]
    tableName ="user"


    // keys = Array_FieldsData.map(itm => itm.field_name)
    // vals = Array_FieldsData.map(itm => itm.field_name)

    sql= `insert into ${tableName} (${keys.join(", ")}) val

}

 */