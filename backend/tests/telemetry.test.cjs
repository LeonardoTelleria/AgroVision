const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
const prisma = require('../src/shared/database/prisma.ts').default;
const { Prisma } = require('../src/generated/prisma/client.ts');
const app = require('../src/app.ts').default;

test('Telemetry: cinco rutas, Decimal, fechas, lote y validación', async () => {
  const input={sensorId:1,fieldId:2,metric:'SOIL_MOISTURE',value:32.1256,unit:'%',recordedAt:'2026-10-08T00:00:00Z'};
  const row={...input,id:5,value:new Prisma.Decimal(input.value),quality:null,recordedAt:new Date(input.recordedAt)};
  const calls=[];let failure=null;const originals={};
  for(const method of ['create','createMany','findMany']) {
    originals[method]=prisma.telemetryReading[method];
    prisma.telemetryReading[method]=async args=>{
      calls.push({method,args});if(failure)throw failure;
      if(method==='createMany')return {count:args.data.length};
      if(method==='create')return {...row,...args.data,value:new Prisma.Decimal(args.data.value)};
      return args.where.fieldId===99||args.where.sensorId===99?[]:[row];
    };
  }
  const server=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base=`http://127.0.0.1:${server.address().port}/api/telemetry`;
  async function request(path='',method='GET',body){
    const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},...(body!==undefined&&{body:JSON.stringify(body)})});
    return {status:r.status,body:await r.json()};
  }
  try {
    let result=await request('','POST',input);assert.equal(result.status,201);
    assert.deepEqual(result.body.data,{...input,id:5,quality:null,recordedAt:row.recordedAt.toISOString()});
    assert.ok(!('timestamp' in result.body.data));
    assert.ok(calls.at(-1).args.data.recordedAt instanceof Date);
    const {recordedAt,...withoutDate}=input;
    const start=Date.now();result=await request('','POST',withoutDate);
    assert.ok(Date.parse(result.body.data.recordedAt)>=start);
    result=await request('','POST',{...input,quality:'VALID'});assert.equal(result.body.data.quality,'VALID');
    result=await request('/batch','POST',[input,{...input,sensorId:3,quality:null}]);
    assert.equal(result.status,201);assert.deepEqual(result.body.data,{count:2});
    assert.equal(calls.at(-1).method,'createMany');assert.ok(calls.at(-1).args.data.every(x=>x.recordedAt instanceof Date));
    const orderBy=[{recordedAt:'desc'},{id:'desc'}];
    for(const [path,where,distinct] of [['/sensor/1',{sensorId:1}],['/field/2',{fieldId:2}],['/field/2/latest',{fieldId:2},['sensorId','metric']]]) {
      result=await request(path);assert.equal(result.status,200);assert.equal(result.body.data[0].value,input.value);
      assert.deepEqual(calls.at(-1),{method:'findMany',args:{where,orderBy,...(distinct&&{distinct})}});
    }
    for(const path of ['/sensor/99','/field/99','/field/99/latest'])assert.deepEqual((await request(path)).body.data,[]);
    const before=calls.length;
    for(const path of ['/sensor/0','/sensor/-1','/sensor/1.2','/sensor/2147483648','/field/abc','/field/0/latest'])assert.equal((await request(path)).status,400);
    for(const body of [{},{...input,sensorId:true},{...input,fieldId:'2'},{...input,value:'32'},{...input,value:100000000},{...input,value:null},{...input,metric:' '},{...input,unit:''},{...input,recordedAt:'invalid'},{...input,recordedAt:'2026-10-08'},{...input,timestamp:input.recordedAt}])assert.equal((await request('','POST',body)).status,400);
    for(const body of [[],{}, {readings:[input]},[input,{...input,metric:''}]])assert.equal((await request('/batch','POST',body)).status,400);
    assert.equal(calls.length,before,'Lotes o entradas inválidas no deben alcanzar Prisma');
    failure=new Prisma.PrismaClientKnownRequestError('foreign key',{code:'P2003',clientVersion:'7.10.0'});
    for(const [path,body] of [['',input],['/batch',[input]]])assert.equal((await request(path,'POST',body)).status,400);
    failure=new Prisma.PrismaClientKnownRequestError('range',{code:'P2020',clientVersion:'7.10.0'});
    assert.equal((await request('','POST',input)).status,400);
    failure=new Prisma.PrismaClientKnownRequestError('duplicate',{code:'P2002',clientVersion:'7.10.0'});
    assert.equal((await request('','POST',input)).status,409);
    failure=new Error('private connection details');
    for(const [path,method,body] of [['','POST',input],['/batch','POST',[input]],['/sensor/1','GET'],['/field/2','GET'],['/field/2/latest','GET']]) {
      result=await request(path,method,body);assert.equal(result.status,500);assert.equal(result.body.success,false);assert.ok(!JSON.stringify(result.body).includes('private connection details'));
    }
  }finally{
    await new Promise(resolve=>server.close(resolve));
    for(const [method,original] of Object.entries(originals))prisma.telemetryReading[method]=original;
    await prisma.$disconnect();
  }
});
