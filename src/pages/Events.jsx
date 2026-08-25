import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { formatINR, formatDate } from '../utils/formatters';
import { Plus, CalendarDays, MoreVertical, Archive, Play, Trash2 } from 'lucide-react';
import { newId } from '../utils/uuid';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import DropdownMenu from '../components/ui/DropdownMenu';

export default function Events() {
  const { events, createEvent, archiveEvent, unarchiveEvent, deleteEvent } = useEvents();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('active'); // active | archived | all
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const filteredEvents = events.filter(e => {
    if (filter === 'active') return e.status === 'active';
    if (filter === 'archived') return e.status === 'archived';
    return true;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      const id = await createEvent({ id: newId(), name: name.trim(), description: description.trim() });
      toast.success('Event created successfully');
      setIsModalOpen(false);
      setName('');
      setDescription('');
      navigate('/events/' + id);
    } catch (err) {
      toast.error('Failed to create event');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event? All its transactions will also be deleted.')) {
      await deleteEvent(id);
      toast.success('Event deleted');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Events</h1>
          <p className="text-muted text-sm mt-1">Manage special event finances</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus size={18} className="mr-2" /> New Event
        </Button>
      </div>

      <div className="flex gap-2 bg-white p-1 rounded-lg w-fit shadow-sm border border-border">
        {['active', 'archived', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-3">
                <Link to={`/events/${event.id}`} className="block flex-1">
                  <h3 className="text-lg font-bold text-text group-hover:text-primary transition-colors">{event.name}</h3>
                  {event.description && <p className="text-sm text-muted mt-1 truncate">{event.description}</p>}
                </Link>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {event.status}
                  </span>
                  <DropdownMenu
                    trigger={<button className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><MoreVertical size={16} /></button>}
                    items={[
                      ...(event.status === 'active' 
                        ? [{ label: 'Archive Event', icon: Archive, onClick: () => archiveEvent(event.id) }]
                        : [{ label: 'Unarchive Event', icon: Play, onClick: () => unarchiveEvent(event.id) }]
                      ),
                      { label: 'Delete Event', icon: Trash2, danger: true, onClick: () => handleDelete(event.id) }
                    ]}
                  />
                </div>
              </div>
              
              <Link to={`/events/${event.id}`} className="block">
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
                  <span className="text-slate-500">Created: {formatDate(event.created_at)}</span>
                  <span className="text-primary font-medium flex items-center gap-1">Manage <span aria-hidden="true">&rarr;</span></span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          description="Create your first event to start tracking isolated finances."
          action={{ label: 'Create Event', onClick: () => setIsModalOpen(true) }}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Event">
        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          <Input
            label="Event Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. വാർഷികം 2026"
            required
            autoFocus
          />
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional details..."
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Create Event</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}