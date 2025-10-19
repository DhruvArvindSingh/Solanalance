use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("BZicjRE3jR6YVWYof7pGSFwqJpJVEBZkY7xzfUimrjhm");

// 🔑 REPLACE THIS WITH YOUR ACTUAL WALLET ADDRESS
const PLATFORM_AUTHORITY: &str = "CMvVjcRz1CfmbLJ2RRUsDBYXh4bRcWttpkNY7FREHLUK";

#[program]
pub mod freelance_platform {
    use super::*;

    /// Creates escrow PDA and locks funds for a job
    pub fn create_job_escrow(
        ctx: Context<CreateJobEscrow>,
        job_id: String,
        freelancer: Pubkey,
        milestone_amounts: [u64; 3],
    ) -> Result<()> {
        require!(job_id.len() <= 50, ErrorCode::JobIdTooLong);
        require!(
            milestone_amounts.iter().all(|&amount| amount > 0),
            ErrorCode::InvalidMilestoneAmount
        );

        let total_amount: u64 = milestone_amounts.iter().sum();

        // Transfer SOL from recruiter to escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.recruiter.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            total_amount,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.recruiter = ctx.accounts.recruiter.key();
        escrow.freelancer = freelancer;
        escrow.job_id = job_id;
        escrow.milestone_amounts = milestone_amounts;
        escrow.milestones_approved = [false; 3];
        escrow.milestones_claimed = [false; 3];
        escrow.bump = ctx.bumps.escrow;

        Ok(())
    }

    /// Recruiter approves a completed milestone
    pub fn approve_milestone(
        ctx: Context<ApproveMilestone>,
        milestone_index: u8,
    ) -> Result<()> {
        require!(milestone_index < 3, ErrorCode::InvalidMilestoneIndex);

        let escrow = &mut ctx.accounts.escrow;

        require!(
            !escrow.milestones_approved[milestone_index as usize],
            ErrorCode::MilestoneAlreadyApproved
        );

        escrow.milestones_approved[milestone_index as usize] = true;

        Ok(())
    }

    /// Freelancer claims payment for approved milestone
    pub fn claim_milestone(
        ctx: Context<ClaimMilestone>,
        milestone_index: u8,
    ) -> Result<()> {
        require!(milestone_index < 3, ErrorCode::InvalidMilestoneIndex);

        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.milestones_approved[milestone_index as usize],
            ErrorCode::MilestoneNotApproved
        );
        require!(
            !escrow.milestones_claimed[milestone_index as usize],
            ErrorCode::MilestoneAlreadyClaimed
        );

        let amount = escrow.milestone_amounts[milestone_index as usize];

        // Transfer SOL from escrow PDA to freelancer
        **escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .freelancer
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        escrow.milestones_claimed[milestone_index as usize] = true;

        Ok(())
    }

    /// Cancel job and refund recruiter (only if no milestones approved)
    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        require!(
            !escrow.milestones_approved.iter().any(|&approved| approved),
            ErrorCode::CannotCancelAfterApproval
        );

        // Calculate remaining balance
        let remaining_balance = escrow
            .milestone_amounts
            .iter()
            .enumerate()
            .filter(|(i, _)| !escrow.milestones_claimed[*i])
            .map(|(_, &amount)| amount)
            .sum::<u64>();

        **ctx
            .accounts
            .escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= remaining_balance;
        **ctx
            .accounts
            .recruiter
            .to_account_info()
            .try_borrow_mut_lamports()? += remaining_balance;

        Ok(())
    }

    /// 🔥 NEW: Platform owner can withdraw any amount from escrow
    /// Use cases: platform fees, dispute resolution, emergency withdrawals
    pub fn platform_withdraw(
        ctx: Context<PlatformWithdraw>,
        amount: u64,
    ) -> Result<()> {
        let escrow_balance = ctx.accounts.escrow.to_account_info().lamports();
        
        require!(
            amount <= escrow_balance,
            ErrorCode::InsufficientEscrowBalance
        );

        // Transfer from escrow to platform authority
        **ctx
            .accounts
            .escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .platform_authority
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    /// 🔥 NEW: Platform owner can withdraw and close escrow completely
    pub fn platform_emergency_close(
        ctx: Context<PlatformEmergencyClose>,
    ) -> Result<()> {
        // All remaining funds go to platform authority
        let escrow_balance = ctx.accounts.escrow.to_account_info().lamports();

        **ctx
            .accounts
            .escrow
            .to_account_info()
            .try_borrow_mut_lamports()? = 0;
        **ctx
            .accounts
            .platform_authority
            .to_account_info()
            .try_borrow_mut_lamports()? += escrow_balance;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(job_id: String)]
pub struct CreateJobEscrow<'info> {
    #[account(
        init,
        payer = recruiter,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", recruiter.key().as_ref(), job_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub recruiter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.recruiter.as_ref(),
            escrow.job_id.as_bytes()
        ],
        bump = escrow.bump,
        has_one = recruiter
    )]
    pub escrow: Account<'info, Escrow>,

    pub recruiter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimMilestone<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.recruiter.as_ref(),
            escrow.job_id.as_bytes()
        ],
        bump = escrow.bump,
        has_one = freelancer
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub freelancer: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.recruiter.as_ref(),
            escrow.job_id.as_bytes()
        ],
        bump = escrow.bump,
        has_one = recruiter,
        close = recruiter
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub recruiter: Signer<'info>,
}

// 🔥 NEW: Platform withdrawal context
#[derive(Accounts)]
pub struct PlatformWithdraw<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.recruiter.as_ref(),
            escrow.job_id.as_bytes()
        ],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        address = PLATFORM_AUTHORITY.parse::<Pubkey>().unwrap() @ ErrorCode::UnauthorizedPlatformAccess
    )]
    pub platform_authority: Signer<'info>,
}

// 🔥 NEW: Platform emergency close context
#[derive(Accounts)]
pub struct PlatformEmergencyClose<'info> {
    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow.recruiter.as_ref(),
            escrow.job_id.as_bytes()
        ],
        bump = escrow.bump,
        close = platform_authority
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        address = PLATFORM_AUTHORITY.parse::<Pubkey>().unwrap() @ ErrorCode::UnauthorizedPlatformAccess
    )]
    pub platform_authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub recruiter: Pubkey,              // 32
    pub freelancer: Pubkey,             // 32
    #[max_len(50)]
    pub job_id: String,                 // 4 + 50
    pub milestone_amounts: [u64; 3],    // 8 * 3
    pub milestones_approved: [bool; 3], // 1 * 3
    pub milestones_claimed: [bool; 3],  // 1 * 3
    pub bump: u8,                       // 1
}

#[error_code]
pub enum ErrorCode {
    #[msg("Job ID cannot exceed 50 characters")]
    JobIdTooLong,
    #[msg("All milestone amounts must be greater than 0")]
    InvalidMilestoneAmount,
    #[msg("Invalid milestone index (must be 0, 1, or 2)")]
    InvalidMilestoneIndex,
    #[msg("Milestone has already been approved")]
    MilestoneAlreadyApproved,
    #[msg("Milestone has not been approved yet")]
    MilestoneNotApproved,
    #[msg("Milestone has already been claimed")]
    MilestoneAlreadyClaimed,
    #[msg("Cannot cancel job after milestone approval")]
    CannotCancelAfterApproval,
    #[msg("Insufficient balance in escrow")]
    InsufficientEscrowBalance,
    #[msg("Unauthorized: Only platform authority can perform this action")]
    UnauthorizedPlatformAccess,
}