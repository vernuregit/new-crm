import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, X, Monitor, Users, DollarSign, Building, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/layout/PageHeader';
import { useUserStore } from '../../stores/userStore';
import { subscribeMyTickets, createTicket, closeTicket } from './services/helpDeskService';

export const HelpDeskPage = () => {
  const user = useUserStore(state => state.user);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState('All');

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('it');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeMyTickets(user.uid, (data) => {
        setTickets(data);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !user?.uid) return;
    
    setIsSubmitting(true);
    try {
      await createTicket(user.uid, {
        subject,
        description,
        category,
        priority,
        status: 'open',
        employeeName: user.displayName || user.email || 'Employee',
        employeeEmail: user.email || '',
      });
      setIsFormOpen(false);
      setSubject('');
      setDescription('');
      setCategory('it');
      setPriority('medium');
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (ticketId) => {
     await closeTicket(ticketId);
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'All') return true;
    if (filter === 'Open') return ticket.status === 'open';
    if (filter === 'In Progress') return ticket.status === 'in_progress';
    if (filter === 'Resolved') return ticket.status === 'resolved';
    return true;
  });

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'it': return <Monitor className="w-5 h-5" />;
      case 'hr': return <Users className="w-5 h-5" />;
      case 'finance': return <DollarSign className="w-5 h-5" />;
      case 'facilities': return <Building className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (prio) => {
    switch(prio) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusColor = (status) => {
     switch((status || 'open').toLowerCase()) {
       case 'open': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
       case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
       case 'resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
       default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
     }
  };

  const formatStatus = (status) => {
     if (!status) return 'Open';
     if (status === 'in_progress') return 'In Progress';
     return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex flex-col h-full relative">
      <PageHeader 
        title="Help Desk" 
        description="Submit and track your support requests"
        actions={<Button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-2"/> New Ticket</Button>}
      />

      <div className="p-6 flex-1 overflow-auto">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg w-fit mb-6">
          {['All', 'Open', 'In Progress', 'Resolved'].map(tab => {
            const count = tab === 'All' ? tickets.length : tickets.filter(t => 
               tab === 'Open' ? t.status === 'open' :
               tab === 'In Progress' ? t.status === 'in_progress' :
               t.status === 'resolved'
            ).length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${filter === tab ? 'bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {tab}
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-0.5 px-2 rounded-full text-xs">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 text-center">
             <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-full mb-4">
               <LifeBuoy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
             </div>
             <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No support tickets yet</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-4">We're here to help! Create a new ticket if you need assistance.</p>
             <Button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 flex items-center gap-1.5">
               <Plus className="w-3.5 h-3.5" /> Create Ticket
             </Button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredTickets.map(ticket => (
               <Card key={ticket.id} className="p-5 flex flex-col">
                 <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0`}>
                       {getCategoryIcon(ticket.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{ticket.subject}</h4>
                          <Badge className={`${getStatusColor(ticket.status)} border-none shrink-0`}>{formatStatus(ticket.status)}</Badge>
                       </div>
                       <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{ticket.description}</p>
                       <div className="flex items-center gap-3">
                          <Badge className={`${getPriorityColor(ticket.priority)} border-none capitalize`}>{ticket.priority} Priority</Badge>
                          <span className="text-xs text-slate-400">
                             {ticket.createdAt?.toDate ? new Date(ticket.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                          </span>
                       </div>
                    </div>
                 </div>
                 {ticket.status !== 'resolved' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                       <Button variant="outline" size="sm" onClick={() => handleResolve(ticket.id)}>
                         <CheckCircle2 className="w-4 h-4 mr-1.5" />
                         Mark Resolved
                       </Button>
                    </div>
                 )}
               </Card>
             ))}
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/20 dark:bg-black/40 backdrop-blur-sm">
           <div className="w-full max-w-md bg-white dark:bg-[#12151E] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transform transition-transform">
             <div className="p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
               <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Support Ticket</h2>
               <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                 <select 
                   className="w-full bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                   value={category}
                   onChange={e => setCategory(e.target.value)}
                 >
                   <option value="it">IT Support</option>
                   <option value="hr">HR</option>
                   <option value="finance">Finance</option>
                   <option value="facilities">Facilities</option>
                   <option value="other">Other</option>
                 </select>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                 <div className="flex gap-2">
                    {['low', 'medium', 'high'].map(p => (
                       <button
                         key={p}
                         type="button"
                         onClick={() => setPriority(p)}
                         className={`flex-1 py-1.5 px-3 rounded-full text-sm font-medium capitalize border ${priority === p ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                       >
                          {p}
                       </button>
                    ))}
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject <span className="text-red-500">*</span></label>
                 <Input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of the issue" />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                 <textarea 
                    className="w-full bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide details about your request..."
                 />
               </div>
               
               <div className="mt-auto pt-6 flex gap-3">
                 <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                 <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</Button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};
