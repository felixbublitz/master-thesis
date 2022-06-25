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
        for(const title of dataset.items.keys()){
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
            row.items.forEach((value, title)=>{
                out += value + CSV_NEW_COLUMN
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
        readonly items : Map<string, any>
        constructor(){
            this.timestamp = Date.now();
            this.items = new Map();
        }

        isEmpty(){
            return this.items.size == 0;
        }

        add(title : string, value : any){
            this.items.set(title, value);
            this.onChanged(this);
        }
        
        onChanged(row : Row){

        }
    }
}
