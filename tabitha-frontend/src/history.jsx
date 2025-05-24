import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
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
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
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

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
  const { active, over } = event;
    if (active.id !== over?.id) {
        const oldIndex = data.findIndex(row => row.id === active.id);
        const newIndex = data.findIndex(row => row.id === over.id);
        setData(oldData => arrayMove(oldData, oldIndex, newIndex));
    }
    };

  useEffect(() => {
    console.log('Fetching history...');
    chrome.history.search({ text: '', maxResults: 100 }, (results) => {
      console.log('History results:', results);
      setData(results);
    });
  }, []);

  const columns = useMemo(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      enableGlobalFilter: true,
      cell: info => info.getValue() || '(No Title)',
    },
    {
      accessorKey: 'url',
      header: 'URL',
      enableGlobalFilter: true,
      cell: info => (
        <a href={info.getValue()} target="_blank" rel="noopener noreferrer">
          {info.getValue()}
        </a>
      ),
    },
    {
      accessorKey: 'lastVisitTime',
      header: 'Last Visited',
      enableGlobalFilter: false,
      cell: info => {
        const date = new Date(info.getValue());
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

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
                <th key={header.id} style={{ padding: '8px', textAlign: 'left', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ cursor: 'pointer' }} onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' 🔼' : ''}
                        {header.column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                            onClick={() => header.column.toggleSorting(false)}
                        >
                            🔼
                        </button>
                        <button
                            onClick={() => header.column.toggleSorting(true)}
                            style={{
                            fontSize: '0.75rem',
                            padding: '2px 4px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            }}
                        >
                            🔽
                        </button>
                        </div>
                    </div>
                    </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  style={{ padding: '8px', borderBottom: '1px solid #ddd' }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HistoryTable />);
