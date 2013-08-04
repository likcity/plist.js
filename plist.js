(function (window) {

    function Plist(file,callback) {
        var that = this,buffer;

        function getHexString(offset,length){
            if (offset==undefined) {offset=0};
            if (length==undefined) {length=buffer.length};
            
            var s="";
            for (var i = 0; i < length; i++) {
                var c=buffer[offset+i].toString(16).toUpperCase();
                if (c.length==1) {c="0"+c};
                s+=c;
            };
            return s;
        }
        function getString(offset,length,unicode){
            if (offset==undefined) {offset=0};
            if (length==undefined) {length=buffer.length};
            
            var s="";
            for (var i = 0; i < length; i++) {
                if (unicode) {
                    s+=String.fromCharCode(getInt(offset+i*2,2));
                }else{
                    s+=String.fromCharCode(buffer[offset+i]);
                }
                
            };
            
            return s;
        }
        function getInt(offset,length){
            if (offset==undefined) {offset=0};
            if (length==undefined) {length=buffer.length};
            
            var n=0;
            for (var i = 0; i < length; i++) {
                var c=buffer[offset+i]<<(8*(length-1-i));
                n+=c;
            };
            return n;
        }

        function getBigEndian(offset,length){
            var a,sa;
            if (length<4) {
                //padding
                sa=getHexString(offset,length);
                for (var i = 0; i < 4-length; i++) {
                    sa="00"+sa;
                };
                length=4;
            }else {
                sa=getHexString(offset,4);
            }

            a=parseInt("0x"+sa);
            var e=(a >> 52 - 32 & 0x7ff) - 1023;
            var ia=(a & 0xfffff | 0x100000) * 1.0 / Math.pow(2,52-32) * Math.pow(2, e) ;
            
            if (length==4) {
                //Float32

                return ia;

            }else if (length==8) {
                //Float32

                var b=parseInt("0x"+getHexString(offset+4,4));
                if (a==0) {
                    return b;
                };
                
                return ia+b * 1.0 / Math.pow(2, 52) * Math.pow(2, e);
            }else{
                console.log('Not support Float length',length);
                return NaN;
            }
        }

        function readBinary(){
            var offset_table=new Array();
            var L,M,N,T,K;

            function decode(offset){
                var typeHead=buffer[offset]; offset++;
                var type=typeHead & 0xF0;
                var type_size=typeHead & 0x0F;
                if (type_size == 0x0F && type==0x10) {
                    console.log(offset-1);
                };
               
                if (type_size == 0x0F){
                    var l=Math.pow(2,(buffer[offset++] & 0x0f));
                    type_size=getInt(offset,l);
                    offset+=l;
                }

                switch(type){
                    case 0x00: // TYPE_BOOL
                        if (type_size==0) {
                            return null;
                        } else{
                            return type_size==0x09;
                        }
                        
                    case 0x10: // TYPE_INT
                        
                        var l=Math.pow(2,type_size);
                        return getInt(offset,l);
                        
                        
                        
                        
                    case 0x20: // TYPE_REAL
                        var l=Math.pow(2,type_size);
                        var f=getBigEndian(offset,l);
                        
                        return f;
                    case 0x30: // TYPE_DATE
                        // time ref from 978307200
                        var x=getBigEndian(offset,8);
                        var timestamp=x+9.783072e8;
                        var date = new Date(timestamp*1000);
                        
                        return date;
                        
                    case 0x40: // TYPE_DATA
                        console.log("TODO: Test This");
                        var uint8Array  = buffer.subarry(offset,offset+type_size);
                        var arrayBuffer = uint8Array.buffer;
                        var blob        = new Blob([arrayBuffer]);
                        return blob;

                    case 0x80: // TYPE_UID
                    case 0x50: // TYPE_STRING_ASCII
                        return getString(offset,type_size);

                    case 0x60: // TYPE_STRING_UNICODE
                        return getString(offset,type_size,true);
                        
                    case 0xA0: // TYPE_ARRAY
                    case 0xC0: // TYPE_SET
                        var arr=[];
                        for (var i = 0; i < type_size; i++) {
                            var key_index=buffer[offset+i];
                            var key_offset=offset_table[key_index];

                            arr[i]=decode(key_offset);
                        };
                        
                        return arr;
                    case 0xD0: // TYPE_DICTIONARY
                        var dict={};
                        for (var i = 0; i < type_size; i++) {
                            var key_index=buffer[offset+i];
                            var key_offset=offset_table[key_index];

                            var val_index=buffer[offset+i+type_size];
                            var val_offset=offset_table[val_index];

                            //console.log('key_offset:',key_offset,'val_offset:',val_offset);

                            var key=decode(key_offset);
                            var val=decode(val_offset);

                            dict[key]=val;
                            //dict.push({key,val});
                        };
                        
                        return dict;
                        
                        
                    default:
                        console.error("unknown object type: " + type);
                        break;
                   
                }
            }
            console.log('Start Binary Parser');
            
             
            
            L=getInt(buffer.length-32+6,1);
            M=getInt(buffer.length-32+7,1);
            N=getBigEndian(buffer.length-32+8,8);
            T=getBigEndian(buffer.length-32+16,8);
            K=getBigEndian(buffer.length-32+24,8);
            
            console.log("L,M,N,T,K",L,M,N,T,K);

            
            for (var i = 0; i < N; i++) {
                offset_table[i]=getInt(K+i*L,L);
            };
            
            return decode(offset_table[T]);
        }

        function readXML(){
            console.log('Start XML Parser');
        }

        function init() {
                
            var reader = new FileReader();
            reader.onload = function (evt) {
                buffer=new Uint8Array(reader.result);
               
                var header=getString(0,6);
               
                console.log('header:',header);

                if (header=='bplist') {
                    
                    callback(that.readBinary());
                }else if (header=='<?xml '){
                    //xml format
                    callback(that.readXML());
                };
                
            }
            reader.onerror = function (evt) {
                if (evt.target.error.code == evt.target.error.NOT_READABLE_ERR) {
                    alert("Failed to read file: " + file.name);
                }
            }
            try {
                reader.readAsArrayBuffer(file);
                //reader.readAsBinaryString(file);
            }
            catch (e) {
                alert(e);
            }
        }

        that.readBinary = readBinary;
        that.readXML    = readXML;

        init();
    }
    
    window.getPlist=Plist;

})(this);
