const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');
const User = require('./models/User');
dotenv.config();

const daysFromNow = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const events = [
 { title: 'AI & Machine Learning Innovation Summit', description: 'Explore practical AI, generative AI applications, machine learning workflows and responsible AI with industry practitioners.', date: daysFromNow(18), location: 'HITEX Exhibition Centre, Hyderabad', category: 'Technology', totalSeats: 250, ticketPrice: 799, image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Future of Web Development Conference', description: 'A hands-on conference covering React, Node.js, cloud deployment, APIs, performance and modern full-stack architecture.', date: daysFromNow(24), location: 'Novotel Convention Centre, Hyderabad', category: 'Technology', totalSeats: 180, ticketPrice: 499, image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Indie Music & Cultural Night', description: 'An energetic evening featuring independent musicians, live bands, local artists and food stalls.', date: daysFromNow(28), location: 'People’s Plaza, Hyderabad', category: 'Music', totalSeats: 600, ticketPrice: 299, image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Entrepreneurship & Startup Networking', description: 'Meet founders, mentors and investors. Learn about product validation, fundraising, go-to-market strategy and startup growth.', date: daysFromNow(32), location: 'The Park, Hyderabad', category: 'Business', totalSeats: 150, ticketPrice: 999, image: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Photography & Visual Arts Exhibition', description: 'Discover contemporary photography, creative installations, emerging artists and interactive visual storytelling.', date: daysFromNow(36), location: 'State Gallery of Art, Hyderabad', category: 'Art', totalSeats: 220, ticketPrice: 150, image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Career Launch: Resume & Interview Workshop', description: 'Improve your resume, practice technical and HR interviews, and learn practical job-search strategies from experienced mentors.', date: daysFromNow(40), location: 'Andhra Loyola College, Vijayawada', category: 'Education', totalSeats: 120, ticketPrice: 0, image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Cloud & Cybersecurity Bootcamp', description: 'Learn cloud fundamentals, identity and access management, secure deployments, threat awareness and hands-on security practices.', date: daysFromNow(45), location: 'Hotel DV Manor, Vijayawada', category: 'Technology', totalSeats: 100, ticketPrice: 699, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000' },
 { title: 'Food, Craft & Local Makers Festival', description: 'A family-friendly weekend celebrating local food businesses, handmade crafts, small brands and regional creativity.', date: daysFromNow(50), location: 'Indira Gandhi Municipal Stadium, Vijayawada', category: 'Lifestyle', totalSeats: 400, ticketPrice: 99, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1000' }
];

(async () => {
 try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eventora');
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  if (!admin) throw new Error('No admin user found. Create/login with an admin account first.');
  let added = 0;
  for (const event of events) {
   const exists = await Event.findOne({ title: event.title });
   if (exists) continue;
   await Event.create({ ...event, availableSeats: event.totalSeats, createdBy: admin._id });
   added++;
  }
  console.log(`Added ${added} new events. Existing users, events and bookings were not deleted.`);
 } catch (err) { console.error('Event seeding failed:', err); process.exitCode = 1; }
 finally { await mongoose.disconnect(); }
})();
