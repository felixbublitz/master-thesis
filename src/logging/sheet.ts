import { Parameter } from "./sequence_logger";

const CSV_NEW_COLUMN = ',';
const CSV_NEW_ROW = '\n';

export class Sheet{
    private readonly fields : Array<string>;
    private readonly rows : Array<Sheet.Row>;
    private readonly creationTime;

    constructor(){
        this.rows = new Array<Sheet.Row>();
        this.fields = new Array<string>();
        this.creationTime = Date.now();
        this.fields.push('time');
    }

    addFeatures(dataset : Sheet.Row){
        for(const param of dataset.items){
            const title = param.getTitle(true);
            if(!this.fields.includes(title))
            this.fields.push(title);
        }
    }

    add(dataset : Sheet.Row){
        if(dataset.isEmpty()) return;

        this.rows.push(dataset);
        this.addFeatures(dataset);

        dataset.onChanged = (dataset : Sheet.Row)=>{
            this.addFeatures(dataset);
        };

    }

    private serialize() : string{
        let out = '';

        //header
        this.fields.forEach(field => {
            out += field + CSV_NEW_COLUMN
        });
        out = out.slice(0, -1);
        out += CSV_NEW_ROW;

        //content
        this.rows.forEach(row => {
            out += (row.timestamp - this.creationTime) + CSV_NEW_COLUMN;
            row.items.forEach((param, title)=>{
                out += param.value + CSV_NEW_COLUMN
            });
            out = out.slice(0, -1);
            out += CSV_NEW_ROW;
            
        });
       
        return out;
    }

    public export(filename: string){
        console.log(this.fields);
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.serialize()));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

export namespace Sheet{
    
    export class Row{
        readonly timestamp : number;
        readonly items : Array<Parameter>
        constructor(){
            this.timestamp = Date.now();
            this.items = new Array();
        }

        isEmpty(){
            return this.items.length == 0;
        }

        add(param : Parameter){
            this.items.push(param);
            this.onChanged(this);
        }
        
        onChanged(row : Row){

        }

        print(){
            let out = "";
            for(const param of this.items){
                out += param.title + ': ' + param.value + ' ' + (param.unit != null?param.unit:'') + '\n';
            }
            console.log(out);
        }
    }
}
