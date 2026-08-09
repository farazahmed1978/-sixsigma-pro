const eventDisposition=record=>!record?'new':record.status==='failed'?'retry':['processed','processing','ignored'].includes(record.status)?'duplicate':'retry';
module.exports={eventDisposition};
