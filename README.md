# SharpMailer

A modern and efficient email campaign manager built with cutting-edge web technologies.

## 🚀 Features

- **Email Campaign Management**: Create, manage and track email campaigns
- **SMTP Integration**: Configure and manage multiple SMTP servers
- **Lead Management**: Organize and manage your contact lists
- **Rich Text Editor**: Powerful email content editor with preview capabilities
- **Real-time Tracking**: Monitor your campaign sending progress
- **Secure Authentication**: Protected routes and secure user management
- **Responsive Design**: Modern UI that works across all devices

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and React Server Components
- **Language**: TypeScript
- **Authentication**: NextAuth.js for secure user authentication
- **Database**: Prisma ORM with SQLite
- **UI Components**:
  - Shadcn UI components
  - Tailwind CSS for styling
  - Class Variance Authority for component variants
  - Lucide icons
  - React Quill for rich text editing
- **Email**: Nodemailer for email sending capabilities
- **State Management**: React Hooks and Server Actions
- **Development**:
  - PNPM as package manager
  - ESLint for code quality
  - PostCSS for CSS processing
  - TypeScript for type safety

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Set up your environment variables:

```env
# Create a .env.local file with:
AUTH_SECRET="your-auth-secret"
EMAIL_SERVER_USER="your-email"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_SERVER_HOST="your-smtp-host"
EMAIL_SERVER_PORT=587
EMAIL_FROM="your-sender-email"
SECRET_KEY="your-32-bytes-secret-key"
DATABASE_URL="your-db-make-sure-to-change-your-prisma-db"
```

4. Initialize the database:

```bash
pnpm prisma migrate dev
```

5. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🛡️ Security Features

- Secure authentication with NextAuth.js
- Encrypted SMTP credentials storage
- Protected API routes
- Type-safe database queries with Prisma

## 🎯 Core Features

- Create and manage email campaigns
- Import and manage contact lists
- Contact can have custom variable
- Configure multiple SMTP servers
- Rich text email template editor
- Real-time sending progress tracking
- Campaign analytics and logs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ using Next.js, TypeScript, and Prisma
