import { useEffect, useMemo, useRef, useState } from 'react'

import { useAccount, useEnsName, useNetwork, useProvider, useSigner } from 'wagmi'
import { useR3vlClient, useCreateRevenuePath, R3vlProvider, createClient, useBalances, useRevenuePathTiers, useUpdateRevenuePath, useWithdraw } from '@r3vl/sdk'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'

// const revPathAddress = "0x3920620177D55DA7849237bb932E5112005d4A04"

const Form = ({ revPathName, revPathAddress, setRevPathAddress }: any) => {
  const { chain } = useNetwork()
  const { address } = useAccount()
  const provider = useProvider()
  const { data: signer } = useSigner()
  const { data: ens } = useEnsName({ address })
  const [collabs, setCollabs] = useState<{ address?: string; share: number }[]>(revPathAddress ? [] : [{ address, share: 100 }])
  const [error, setError] = useState("")
  const ensRef = useRef({})
  const collabsMemo = useMemo(() => {
    return collabs
  }, [collabs.reduce((prev, curr) => {
    return prev + curr.share
  }, collabs.length), collabs])

  useR3vlClient({
    chainId: chain?.id as any,
    provider,
    signer: signer as any
  })

  useR3vlClient({
    chainId: chain?.id as any,
    provider,
    signer: signer as any,
    revPathAddress
  })
    
  const { mutate, data: tx, isFetched: createRevPathIsFetched, error: _error } = useCreateRevenuePath()
  const { data } = useBalances(revPathAddress)
  const { data: tiers, isFetched: tiersFetched } = useRevenuePathTiers(revPathAddress, { enabled: !!revPathAddress })
  const update = useUpdateRevenuePath(revPathAddress)
  const mutation = useWithdraw(revPathAddress)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const tier = tiers?.[0]

    if (!tiersFetched) return
    if (!tier) return

    const newCollabs = Object.keys(tier.proportions as any).reduce((prev: any, curr) => {
      return [...prev, { address: curr, share: tier.proportions[curr] * 10000000000000 }]
    }, [])

    setCollabs(newCollabs as any)
  }, [tiers, tiersFetched, setCollabs, address])

  useEffect(() => {
    if ((tx as any)?.wait) {
      setTimeout(() => setIsCreating(true), 200);

      (tx as any).wait().then((r: any) => {
        console.log(r.logs[0].address)

        setRevPathAddress(r.logs[0].address)

        setIsCreating(false)
      })
    }
  }, [tx, setRevPathAddress])

  useEffect(() => {
    if (_error) setTimeout(() => setIsCreating(false), 100)
  }, [_error])

  useEffect(() => {
    if (createRevPathIsFetched) setIsCreating(false)
  }, [createRevPathIsFetched])

  const submitPath = () => {
    setIsCreating(true)

    const sum = collabs.reduce((prev, curr) => {
      return prev + curr.share
    }, 0)

    if (sum > 100 || sum < 100) {
      setError("Total share must be equal to 100%")

      return
    }

    mutate({
      name: revPathName,
      walletList: [
        collabs.map(collab => {
          if (/^[\dA-Za-z][\dA-Za-z-]{1,61}[\dA-Za-z]\.eth$/.test(collab.address || ""))
            return ensRef.current[collab.address as keyof typeof ensRef.current]

          return collab.address
        }) as any
      ],
      distribution: [
        collabs.map(collab => collab.share) as any
      ],
      mutabilityDisabled: false
    })
  }

  const updatePath = () => {
    const sum = collabs.reduce((prev, curr) => {
      return prev + curr.share
    }, 0)
  
    if (sum > 100 || sum < 100) {
      setError("Total share must be equal to 0")
  
      return
    }

    update?.updateRevenueTiers.mutate({
      walletList: [collabs.map(collab => collab.address) as any],
      distribution: [collabs.map(collab => collab.share)],
      tierNumbers: [0],
    })
  }

  return <>
    <div className='flex flex-col gap-2 text-black mb-4'>
      {collabsMemo.map((collab, i) => {
        return <div key={i} className='flex gap-2'>
          <div className='flex relative items-center w-1/4'>
            <input
              onChange={(e) => {
                const newCollabs = collabs.map((_, index) => {
                  if (index === i) return { address: collab.address, share: parseFloat(e.target.value || "0") }

                  return _
                })

                setCollabs(newCollabs)
                setError("")
              }}
              className='border border-black text-black h-8 w-full'
              value={collab.share}
              placeholder="%"
            />
            <p className="text-sm absolute right-3">%</p>
          </div>
          <input
            onChange={async (e) => {
              const newCollabs = collabs.map((_, index) => {
                if (index === i) return { address: e.target.value, share: collab.share }

                  return _
              })

              setCollabs(newCollabs)

              if (!ethers.utils.isAddress(e.target.value) && /^[\dA-Za-z][\dA-Za-z-]{1,61}[\dA-Za-z]\.eth$/.test(e.target.value)) {
                const ensAddress = await provider.resolveName(e.target.value) || ""
                    
                ensRef.current = { ...ensRef.current, [e.target.value]: ensAddress }
              }
            }}
            placeholder='0x1234...56aB'
            className='w-3/4 border border-black text-black h-8 text-xs'
            value={collab.address}
          />
          <button className='text-red-600 text-xs' onClick={() => {  
            const newCollabs = collabs.filter((_, index) => index !== i)

            setCollabs([])

            setCollabs([...newCollabs])
          }}>
            Delete
          </button>
        </div>
      })}

      <p className='text-red-600'>{error}</p>

      <div className='flex gap-4 w-2/3 mt-4'>
        <button
          className='cursor-pointer bg-white hover:opacity-80 text-black px-4 py-1 rounded-full'
          onClick={() => setCollabs([ ...collabs, { address: '', share: 0 } ])}
        >
          Add
        </button>

        {!revPathAddress && <button
          type="button"
          disabled={isCreating}
          className='cursor-pointer bg-white text-violet-500 hover:opacity-80 px-4 py-1 rounded-full'
          onClick={submitPath}
        >
          {isCreating ? "Pending..." : "Deploy Revenue Path"}
        </button>}
        {tiersFetched && tiers?.[0] && <button
          className='cursor-pointer bg-white text-black px-4 py-1 rounded-full'
          onClick={() => {
            updatePath()
          }}
        >
          {update?.updateRevenueTiers.isLoading ? "pending..." : "Update Revenue Path"}
        </button>}
      </div>
      {false && data && <div className='flex gap-4 w-2/3 mt-4 items-center justify-start text-white'>
        <div>
          <p className="font-medium">Balance</p>
          <p className="font-header">{data?.withdrawable + data?.pendingDistribution} ETH</p>
        </div>

        <button
          type="button"
          disabled={mutation?.isLoading}
          className='cursor-pointer bg-white text-black px-4 py-1 rounded-full'
          onClick={() => {
            mutation?.mutate({
              walletAddress: address || "",
            })
          }}
        >
          {mutation?.isLoading ? "Pending..." : "Withdraw"}
        </button>
      </div>}
    </div>
  </>
}

export default Form;