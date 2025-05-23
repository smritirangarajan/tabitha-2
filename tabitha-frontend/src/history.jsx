import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import EditableCell from './EditableCell';
import {
 useReactTable,
 getCoreRowModel,
 getSortedRowModel,
 getFilteredRowModel,
 flexRender,
} from '@tanstack/react-table';


import {
 DndContext,
 closestCenter,
 PointerSensor,
 useSensor,
 useSensors,
} from '@dnd-kit/core';


import {
 SortableContext,
 verticalListSortingStrategy,
 useSortable,
 arrayMove,
} from '@dnd-kit/sortable';


import { CSS } from '@dnd-kit/utilities';


function SortableRow({ row, children }) {
 const {
   attributes,
   listeners,
   setNodeRef,
   transform,
   transition,
 } = useSortable({ id: row.id });


 const style = {
   transform: CSS.Transform.toString(transform),
   transition,
 };


 return (
   <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
     {children}
   </tr>
 );
}


function HistoryTable() {
 const [data, setData] = useState([]);
 const [sorting, setSorting] = useState([]);
 const [globalFilter, setGlobalFilter] = useState('');


 useEffect(() => {
    chrome.history.search({ text: '', maxResults: 100 }, (results) => {
      const grouped = {};
      
      results.forEach((item, index) => {
        const visitTime = new Date(item.lastVisitTime || Date.now());
        const hostname = new URL(item.url).hostname;
        const key = `${hostname}-${Math.floor(visitTime.getTime() / (10 * 60 * 1000))}`; // 10-minute grouping

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            hostname,
            timeBucket: visitTime,
            items: []
          };
        }

        grouped[key].items.push({
          ...item,
          id: item.id || `${key}-${index}`,
          groupId: key,
        });
      });

      const flattened = Object.values(grouped).flatMap(group => group.items);
      setData(flattened);
    });
  }, []);



 const updateData = (rowIndex, columnId, value) => {
   setData(old =>
     old.map((row, index) =>
       index === rowIndex
         ? {
             ...row,
             [columnId]: value,
           }
         : row
     )
   );
 };


 const columns = useMemo(() => [
   {
    accessorKey: 'title', // still use title for filtering/sorting
    header: 'Page',
    cell: info => {
    const row = info.row.original;
    const title = row.title || '(No Title)';
    const url = row.url;
    const displayUrl = url.length > 100 ? url.slice(0, 100) + '…' : url;

    return (
      <div>
        <div style={{ fontWeight: 'bold' }}>{title}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#555', fontSize: '0.9em', wordBreak: 'break-all' }}
          title={url} // shows full URL on hover
        >
          {displayUrl}
        </a>
      </div>
    );
  }
  },
  
   {
     accessorKey: 'lastVisitTime',
     header: 'Last Visited',
     cell: info => {
       const date = new Date(info.getValue());
       return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
     },
   },
   {
      accessorKey: 'groupId',
      header: 'Group',
      cell: info => {
        const parts = info.getValue().split('-');
        return parts[0]; // hostname
      },
    },
 ], []);


 const table = useReactTable({
   data,
   columns,
   state: {
     sorting,
     globalFilter,
   },
   onSortingChange: setSorting,
   getCoreRowModel: getCoreRowModel(),
   getSortedRowModel: getSortedRowModel(),
   meta: {
     updateData,
   },
   getFilteredRowModel: getFilteredRowModel(),
   globalFilterFn: (row, columnId, filterValue) => {
     const value = row.getValue(columnId);
     return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
   },
 });


 const sensors = useSensors(useSensor(PointerSensor));


 const handleDragEnd = (event) => {
   const { active, over } = event;
   if (!over || active.id === over.id) return;


   const oldIndex = data.findIndex(row => row.id === active.id);
   const newIndex = data.findIndex(row => row.id === over.id);


   setData(prev => arrayMove(prev, oldIndex, newIndex));
 };


 return (
   <div style={{ padding: '1rem' }}>
     <h1>Browser History</h1>
     <input
      type="text"
      value={globalFilter ?? ''}
      onChange={(e) => setGlobalFilter(e.target.value)}
      placeholder="Search history by title or URL..."
      style={{
        marginBottom: '1rem',
        padding: '0.5rem',
        width: '100%',
        fontSize: '1rem',
        borderRadius: '6px',
        border: '1px solid #ccc'
      }}
    />


     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
       <thead>
         {table.getHeaderGroups().map(headerGroup => (
           <tr key={headerGroup.id}>
             {headerGroup.headers.map(header => (
               <th
                 key={header.id}
                 style={{ padding: '8px', textAlign: 'left', verticalAlign: 'top' }}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span style={{ cursor: 'pointer' }} onClick={header.column.getToggleSortingHandler()}>
                     {flexRender(header.column.columnDef.header, header.getContext())}
                     {header.column.getIsSorted() === 'asc' ? ' 🔼' : ''}
                     {header.column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                   </span>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                   </div>
                 </div>
               </th>
             ))}
           </tr>
         ))}
       </thead>
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <SortableContext
           items={table.getRowModel().rows.map(row => row.id)}
           strategy={verticalListSortingStrategy}
         >
           <tbody>
             {table.getRowModel().rows.map(row => (
               <SortableRow key={row.id} row={row}>
                 {row.getVisibleCells().map(cell => (
                   <td
                     key={cell.id}
                     style={{ padding: '8px', borderBottom: '1px solid #ddd' }}
                   >
                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
                   </td>
                 ))}
               </SortableRow>
             ))}
           </tbody>
         </SortableContext>
       </DndContext>
     </table>
   </div>
 );
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HistoryTable />);